import type { Certificate, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { parseISODate, formatPlainDate } from "@/lib/dates";
import { buildCertificateText } from "@/lib/certificate-text";
import {
  buildPdfFilename,
  generateVerificationToken,
  reserveCertificateNumber,
} from "@/lib/certificate-number";
import { generateQrPng, verificationUrl } from "@/lib/qr";
import { certificatePdfKey, storage } from "@/lib/storage";
import { renderCertificate } from "@/lib/pdf/engine";
import { parseTemplateConfig } from "@/lib/pdf/template-config";
import type { CertificateInput } from "@/lib/validation";

export class CertificateError extends Error {
  readonly code: string;

  constructor(message: string, code = "CERTIFICATE_ERROR") {
    super(message);
    this.name = "CertificateError";
    this.code = code;
  }
}

export interface DuplicateMatch {
  id: string;
  certificateNumber: string;
  candidateName: string;
  role: string;
  startDate: Date;
  endDate: Date;
  status: string;
}

/**
 * Same person, same role, overlapping period. This is a warning, not a block:
 * reissuing a corrected certificate is a legitimate thing to do, and blocking it
 * just teaches people to work around the system.
 */
export async function findPossibleDuplicates(input: {
  candidateName: string;
  email?: string | null;
  role: string;
  startDate: Date;
  endDate: Date;
}): Promise<DuplicateMatch[]> {
  const matches = await prisma.certificate.findMany({
    where: {
      status: { not: "DRAFT" },
      role: { equals: input.role },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
      candidate: {
        OR: [
          { name: { equals: input.candidateName } },
          ...(input.email ? [{ email: { equals: input.email } }] : []),
        ],
      },
    },
    include: { candidate: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return matches.map((c) => ({
    id: c.id,
    certificateNumber: c.certificateNumber,
    candidateName: c.candidate.name,
    role: c.role,
    startDate: c.startDate,
    endDate: c.endDate,
    status: c.status,
  }));
}

async function upsertCandidate(tx: Prisma.TransactionClient, input: CertificateInput) {
  const email = input.email?.trim().toLowerCase() || null;

  // Email is the only reliable identity key. Without one we create a fresh
  // candidate rather than merging two people who happen to share a name.
  if (email) {
    const existing = await tx.candidate.findFirst({ where: { email } });
    if (existing) {
      return tx.candidate.update({
        where: { id: existing.id },
        data: {
          name: input.candidateName.trim(),
          title: input.title || existing.title,
          phone: input.phone?.trim() || existing.phone,
        },
      });
    }
  }

  return tx.candidate.create({
    data: {
      name: input.candidateName.trim(),
      title: input.title || null,
      email,
      phone: input.phone?.trim() || null,
    },
  });
}

/** Builds the PDF for a certificate row and writes it to storage. */
async function generatePdfFor(certificate: Certificate & { candidate: { name: string; title: string | null } }) {
  const template = await prisma.template.findUniqueOrThrow({ where: { id: certificate.templateId } });
  const config = parseTemplateConfig(certificate.templateSnapshot);

  const templatePdf = await storage().get(template.fileKey);
  const url = verificationUrl(certificate.verificationToken);
  const qrPng = await generateQrPng(url);

  const text = buildCertificateText({
    name: certificate.candidate.name,
    title: certificate.candidate.title,
    role: certificate.role,
    startDate: certificate.startDate,
    endDate: certificate.endDate,
  });

  const { pdf, warnings } = await renderCertificate({
    templatePdf,
    config,
    data: {
      candidateName: text.displayName,
      bodyParagraphs: text.paragraphs,
      certificateNumber: certificate.certificateNumber,
      issueDate: formatPlainDate(certificate.issueDate),
      role: certificate.role,
      qrPng,
    },
  });

  const key = certificatePdfKey(certificate.issueDate.getUTCFullYear(), certificate.certificateNumber);
  await storage().put(key, pdf, "application/pdf");

  return {
    key,
    filename: buildPdfFilename(certificate.candidate.name, certificate.certificateNumber),
    warnings,
  };
}

export interface CreateResult {
  certificate: Certificate;
  warnings: string[];
  verificationUrl: string;
}

/**
 * The full issue flow.
 *
 * The number is reserved and the row inserted in one short transaction, so the
 * counter lock is never held across PDF rendering. If rendering then fails the
 * record stays DRAFT and can be retried — a burnt number is a much cheaper
 * failure than two certificates sharing one.
 */
export async function createCertificate(input: CertificateInput, userId: string): Promise<CreateResult> {
  const startDate = parseISODate(input.startDate);
  const endDate = parseISODate(input.endDate);
  const issueDate = parseISODate(input.issueDate);

  const template = await prisma.template.findUnique({ where: { id: input.templateId } });
  if (!template) throw new CertificateError("That template no longer exists.", "TEMPLATE_NOT_FOUND");
  if (!template.isActive) throw new CertificateError("That template is not active.", "TEMPLATE_INACTIVE");

  const draft = await prisma.$transaction(async (tx) => {
    const candidate = await upsertCandidate(tx, input);
    const certificateNumber = await reserveCertificateNumber(tx, issueDate.getUTCFullYear());

    const created = await tx.certificate.create({
      data: {
        certificateNumber,
        verificationToken: generateVerificationToken(),
        candidateId: candidate.id,
        templateId: template.id,
        // Frozen so a regenerate always reproduces this exact layout, even if
        // someone nudges a coordinate in the live template next month.
        templateSnapshot: template.config as Prisma.InputJsonValue,
        role: input.role.trim(),
        startDate,
        endDate,
        issueDate,
        status: "DRAFT",
        createdById: userId,
      },
      include: { candidate: true },
    });

    await recordAudit(
      {
        userId,
        certificateId: created.id,
        action: "CREATE_CERTIFICATE",
        metadata: { certificateNumber, candidate: candidate.name, role: created.role },
      },
      tx,
    );

    return created;
  });

  const { key, filename, warnings } = await generatePdfFor(draft);

  const issued = await prisma.certificate.update({
    where: { id: draft.id },
    data: { status: "ISSUED", pdfKey: key, pdfFilename: filename },
  });

  await recordAudit({
    userId,
    certificateId: issued.id,
    action: "GENERATE_CERTIFICATE",
    metadata: { certificateNumber: issued.certificateNumber, warnings },
  });

  return { certificate: issued, warnings, verificationUrl: verificationUrl(issued.verificationToken) };
}

/**
 * Rebuilds the PDF from the stored snapshot. Used after a failed generation and
 * when a template asset is replaced. The certificate number and verification
 * token never change, so QR codes already in circulation keep working.
 */
export async function regenerateCertificate(certificateId: string, userId: string): Promise<string[]> {
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id: certificateId },
    include: { candidate: true },
  });

  if (certificate.status === "REVOKED") {
    throw new CertificateError("A revoked certificate cannot be regenerated.", "REVOKED");
  }

  const { key, filename, warnings } = await generatePdfFor(certificate);

  await prisma.certificate.update({
    where: { id: certificate.id },
    data: { status: "ISSUED", pdfKey: key, pdfFilename: filename },
  });

  await recordAudit({
    userId,
    certificateId: certificate.id,
    action: "GENERATE_CERTIFICATE",
    metadata: { regenerated: true, warnings },
  });

  return warnings;
}

/**
 * Retrieves the compiled PDF for a certificate.
 * If the file is missing from local/ephemeral storage, renders it dynamically
 * on the fly using the database record and template snapshot.
 */
export async function getOrRenderCertificatePdf(certificateId: string): Promise<{ pdf: Uint8Array; filename: string }> {
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id: certificateId },
    include: { candidate: true },
  });

  const filename = certificate.pdfFilename ?? buildPdfFilename(certificate.candidate.name, certificate.certificateNumber);

  // 1. Try reading from storage if key exists
  if (certificate.pdfKey) {
    try {
      const bytes = await storage().get(certificate.pdfKey);
      if (bytes && bytes.byteLength > 195000) {
        return { pdf: bytes, filename };
      }
    } catch {}
  }

  // 2. Render on the fly using stored snapshot and candidate details
  const template = await prisma.template.findUniqueOrThrow({ where: { id: certificate.templateId } });
  const config = parseTemplateConfig(certificate.templateSnapshot);
  const templatePdf = await storage().get(template.fileKey);
  const url = verificationUrl(certificate.verificationToken);
  const qrPng = await generateQrPng(url);

  const text = buildCertificateText({
    name: certificate.candidate.name,
    title: certificate.candidate.title,
    role: certificate.role,
    startDate: certificate.startDate,
    endDate: certificate.endDate,
  });

  const { pdf } = await renderCertificate({
    templatePdf,
    config,
    data: {
      candidateName: text.displayName,
      bodyParagraphs: text.paragraphs,
      certificateNumber: certificate.certificateNumber,
      issueDate: formatPlainDate(certificate.issueDate),
      role: certificate.role,
      qrPng,
    },
  });

  // Cache in storage if possible
  if (certificate.pdfKey) {
    await storage().put(certificate.pdfKey, pdf, "application/pdf").catch(() => {});
  }

  return { pdf, filename };
}

export async function revokeCertificate(certificateId: string, reason: string, userId: string) {
  const certificate = await prisma.certificate.findUniqueOrThrow({ where: { id: certificateId } });

  if (certificate.status === "REVOKED") {
    throw new CertificateError("That certificate is already revoked.", "ALREADY_REVOKED");
  }

  const updated = await prisma.certificate.update({
    where: { id: certificateId },
    // The PDF stays in storage. Copies are already in the wild, so the record
    // of what was issued has to survive; only its validity changes.
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedById: userId,
      revocationReason: reason.trim(),
    },
  });

  await recordAudit({
    userId,
    certificateId,
    action: "REVOKE_CERTIFICATE",
    metadata: { certificateNumber: updated.certificateNumber, reason: reason.trim() },
  });

  return updated;
}

/** Renders a watermarked preview without touching the database. */
export async function renderPreview(input: CertificateInput): Promise<Uint8Array> {
  const template = await prisma.template.findUnique({ where: { id: input.templateId } });
  if (!template) throw new CertificateError("That template no longer exists.", "TEMPLATE_NOT_FOUND");

  const config = parseTemplateConfig(template.config);
  const startDate = parseISODate(input.startDate);
  const endDate = parseISODate(input.endDate);
  const issueDate = parseISODate(input.issueDate);

  const text = buildCertificateText({
    name: input.candidateName,
    title: input.title || null,
    role: input.role,
    startDate,
    endDate,
  });

  const templatePdf = await storage().get(template.fileKey);
  const placeholderNumber = `${"NXT-INT"}-${issueDate.getUTCFullYear()}-______`;
  const qrPng = await generateQrPng(verificationUrl("preview-not-yet-issued"));

  const { pdf } = await renderCertificate({
    templatePdf,
    config,
    data: {
      candidateName: text.displayName,
      bodyParagraphs: text.paragraphs,
      certificateNumber: placeholderNumber,
      issueDate: formatPlainDate(issueDate),
      role: input.role,
      qrPng,
    },
    watermark: "PREVIEW",
  });

  return pdf;
}

export interface SearchParams {
  q?: string;
  status?: "DRAFT" | "ISSUED" | "REVOKED";
  year?: number;
  templateId?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

export async function searchCertificates(params: SearchParams) {
  const perPage = params.perPage ?? 20;
  const page = Math.max(1, params.page ?? 1);
  const where: Prisma.CertificateWhereInput = {};

  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { certificateNumber: { contains: q } },
      { role: { contains: q } },
      { candidate: { name: { contains: q } } },
      { candidate: { email: { contains: q } } },
    ];
  }
  if (params.status) where.status = params.status;
  if (params.templateId) where.templateId = params.templateId;
  if (params.year) {
    where.issueDate = {
      gte: new Date(Date.UTC(params.year, 0, 1)),
      lte: new Date(Date.UTC(params.year, 11, 31)),
    };
  }
  if (params.from || params.to) {
    where.issueDate = {
      ...(params.from ? { gte: parseISODate(params.from) } : {}),
      ...(params.to ? { lte: parseISODate(params.to) } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.certificate.findMany({
      where,
      include: { candidate: true, createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.certificate.count({ where }),
  ]);

  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getDashboardStats() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [total, thisMonth, candidates, revoked, recent] = await Promise.all([
    prisma.certificate.count({ where: { status: { not: "DRAFT" } } }),
    prisma.certificate.count({ where: { status: { not: "DRAFT" }, createdAt: { gte: monthStart } } }),
    prisma.candidate.count(),
    prisma.certificate.count({ where: { status: "REVOKED" } }),
    prisma.certificate.findMany({
      include: { candidate: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return { total, thisMonth, candidates, revoked, recent };
}

/** The shape of certificate data the public verification page sees. Matches by token or certificateNumber. */
export async function verifyByToken(token: string) {
  if (!token || token.length > 64) return null;
  const trimmed = token.trim();

  const certificate = await prisma.certificate.findFirst({
    where: {
      OR: [
        { verificationToken: trimmed },
        { certificateNumber: trimmed },
      ],
    },
    select: {
      certificateNumber: true,
      role: true,
      startDate: true,
      endDate: true,
      issueDate: true,
      status: true,
      revokedAt: true,
      candidate: { select: { name: true, title: true } },
    },
  });

  if (!certificate || certificate.status === "DRAFT") return null;
  return certificate;
}

/** Deletes a certificate and its audit records permanently. */
export async function deleteCertificate(id: string) {
  return await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({
      where: { certificateId: id },
    });
    return await tx.certificate.delete({
      where: { id },
    });
  });
}
