import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPlainDate } from "@/lib/dates";
import { verificationUrl } from "@/lib/qr";
import { StatusPill } from "@/components/ui";
import { CertificateActions } from "../actions";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function CertificatePreviewPage({
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
    },
  });

  if (!certificate) notFound();

  const link = verificationUrl(certificate.verificationToken);
  const canRevoke = can(session?.user.role, "certificate:revoke");
  const canRegenerate = can(session?.user.role, "certificate:regenerate");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2 text-small text-ink-muted">
        <Link href="/certificates" className="hover:underline">Certificates</Link>
        <span>/</span>
        <Link href={`/certificates/${certificate.id}`} className="hover:underline">{certificate.certificateNumber}</Link>
        <span>/</span>
        <span className="text-ink">Preview</span>
      </div>

      <header className="mt-4 flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="tabular font-record text-3xl font-semibold">{certificate.certificateNumber}</h1>
            <StatusPill status={certificate.status} />
          </div>
          <p className="mt-1 text-small text-ink-muted">
            {certificate.candidate.title ? `${certificate.candidate.title} ` : ""}{certificate.candidate.name} — {certificate.role}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/certificates/${certificate.id}`}
            className="rounded border border-rule bg-white px-3 py-1.5 text-small font-medium text-ink hover:border-ink-muted"
          >
            View Record Details
          </Link>
          <a
            href={`/api/certificates/${certificate.id}/pdf`}
            download
            className="rounded bg-ink px-4 py-1.5 text-small font-medium text-white hover:bg-ink-soft"
          >
            Download PDF
          </a>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
        {/* PDF viewer frame */}
        <div className="overflow-hidden rounded-lg border border-rule bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-rule bg-paper px-4 py-2 text-micro font-medium text-ink-muted">
            <span>Official Document Preview</span>
            <span>{certificate.pdfFilename ?? "Document Preview"}</span>
          </div>
          <iframe
            src={`/api/certificates/${certificate.id}/pdf?inline=1`}
            title={`Preview of ${certificate.certificateNumber}`}
            className="h-[600px] w-full border-none md:h-[700px]"
          />
        </div>

        {/* Sidebar Info & Controls */}
        <div className="space-y-6">
          <div className="rounded-lg border border-rule bg-white p-5 shadow-sm">
            <h2 className="text-small font-semibold text-ink-soft uppercase tracking-wider">
              Certificate Information
            </h2>
            <dl className="mt-4 space-y-3 text-small">
              <div>
                <dt className="text-micro text-ink-muted">Candidate</dt>
                <dd className="font-medium text-ink">
                  {certificate.candidate.title ? `${certificate.candidate.title} ` : ""}{certificate.candidate.name}
                </dd>
              </div>
              {certificate.candidate.email ? (
                <div>
                  <dt className="text-micro text-ink-muted">Email</dt>
                  <dd className="text-ink">{certificate.candidate.email}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-micro text-ink-muted">Role</dt>
                <dd className="text-ink">{certificate.role}</dd>
              </div>
              <div>
                <dt className="text-micro text-ink-muted">Internship Period</dt>
                <dd className="text-ink">
                  {formatPlainDate(certificate.startDate)} – {formatPlainDate(certificate.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-micro text-ink-muted">Issued Date</dt>
                <dd className="text-ink">{formatPlainDate(certificate.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-micro text-ink-muted">Template Version</dt>
                <dd className="text-ink">{certificate.template.name} (v{certificate.template.version})</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-rule bg-white p-5 shadow-sm">
            <h2 className="text-small font-semibold text-ink-soft uppercase tracking-wider">
              Verification & QR
            </h2>
            <p className="mt-2 text-micro text-ink-muted">
              Scanning the printed QR code opens the authoritative verification registry:
            </p>
            <div className="mt-3 rounded border border-rule bg-paper p-2.5 text-micro font-mono break-all select-all">
              {link}
            </div>
            <div className="mt-4">
              <CertificateActions
                certificateId={certificate.id}
                certificateNumber={certificate.certificateNumber}
                verificationUrl={link}
                status={certificate.status}
                canRevoke={canRevoke}
                canRegenerate={canRegenerate}
                hasPdf={Boolean(certificate.pdfKey)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
