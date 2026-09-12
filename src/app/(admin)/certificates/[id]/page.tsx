import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { formatPlainDate } from "@/lib/dates";
import { buildCertificateText } from "@/lib/certificate-text";
import { verificationUrl } from "@/lib/qr";
import { StatusPill } from "@/components/ui";
import { CertificateActions } from "./actions";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  CREATE_CERTIFICATE: "Record created",
  GENERATE_CERTIFICATE: "PDF generated",
  DOWNLOAD_CERTIFICATE: "Downloaded",
  REVOKE_CERTIFICATE: "Revoked",
  UPDATE_CERTIFICATE: "Updated",
  RESTORE_CERTIFICATE: "Restored",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd className="text-small">{children}</dd>
    </div>
  );
}

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      candidate: true,
      template: { select: { name: true, version: true } },
      createdBy: { select: { name: true, email: true } },
      revokedBy: { select: { name: true, email: true } },
      auditLogs: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 25,
      },
    },
  });

  if (!certificate) notFound();

  const text = buildCertificateText({
    name: certificate.candidate.name,
    title: certificate.candidate.title,
    role: certificate.role,
    startDate: certificate.startDate,
    endDate: certificate.endDate,
  });

  const canRevoke = can(session?.user.role, "certificate:revoke");
  const canRegenerate = can(session?.user.role, "certificate:regenerate");
  const canDelete = can(session?.user.role, "certificate:delete");
  const link = verificationUrl(certificate.verificationToken);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/certificates" className="text-small text-ink-muted underline underline-offset-2">
        All certificates
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="tabular font-record text-3xl">{certificate.certificateNumber}</h1>
          <p className="mt-1 text-small text-ink-muted">
            {certificate.candidate.name} — {certificate.role}
          </p>
        </div>
        <StatusPill status={certificate.status} />
      </header>

      {certificate.status === "REVOKED" ? (
        <div className="mt-5 rounded border border-seal/30 bg-seal-tint px-4 py-3 text-small text-seal">
          <p className="font-medium">
            Revoked on {certificate.revokedAt ? formatPlainDate(certificate.revokedAt) : "an unknown date"}
            {certificate.revokedBy ? ` by ${certificate.revokedBy.name}` : ""}
          </p>
          {certificate.revocationReason ? <p className="mt-1">{certificate.revocationReason}</p> : null}
          <p className="mt-1">The PDF is kept on file. The verification page now reports it as revoked.</p>
        </div>
      ) : null}

      <div className="mt-6">
        <CertificateActions
          certificateId={certificate.id}
          certificateNumber={certificate.certificateNumber}
          verificationUrl={link}
          status={certificate.status}
          canRevoke={canRevoke}
          canRegenerate={canRegenerate}
          canDelete={canDelete}
          hasPdf={Boolean(certificate.pdfKey)}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-small font-medium text-ink-soft">Record</h2>
        <dl className="mt-2 border-t border-rule">
          <Row label="Candidate">
            {certificate.candidate.title ? `${certificate.candidate.title} ` : ""}
            {certificate.candidate.name}
          </Row>
          {certificate.candidate.email ? <Row label="Email">{certificate.candidate.email}</Row> : null}
          {certificate.candidate.phone ? <Row label="Phone">{certificate.candidate.phone}</Row> : null}
          <Row label="Internship role">{certificate.role}</Row>
          <Row label="Internship period">
            {formatPlainDate(certificate.startDate)} – {formatPlainDate(certificate.endDate)}
          </Row>
          <Row label="Issued on">{formatPlainDate(certificate.issueDate)}</Row>
          <Row label="Template">{certificate.template.name} (v{certificate.template.version})</Row>
          <Row label="Issued by">{certificate.createdBy.name}</Row>
          <Row label="Verification link">
            <span className="tabular break-all">{link}</span>
          </Row>
          <Row label="File">{certificate.pdfFilename ?? "Not generated"}</Row>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-small font-medium text-ink-soft">Wording on the certificate</h2>
        <blockquote className="mt-2 border-l-2 border-rule bg-white px-5 py-4 font-record text-[1.0625rem] leading-relaxed">
          {text.paragraphs.map((paragraph) => (
            <p key={paragraph} className="max-w-measure [&+p]:mt-3">{paragraph}</p>
          ))}
        </blockquote>
      </section>

      <section className="mt-10">
        <h2 className="text-small font-medium text-ink-soft">History</h2>
        <ul className="mt-2 border-t border-rule">
          {certificate.auditLogs.map((log) => (
            <li key={log.id} className="flex flex-wrap justify-between gap-2 border-b border-rule py-2.5 text-small">
              <span>{ACTION_LABELS[log.action] ?? log.action}</span>
              <span className="text-ink-muted">
                {log.user?.email ?? "system"} ·{" "}
                {log.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
