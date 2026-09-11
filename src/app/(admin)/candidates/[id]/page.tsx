import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPlainDate, formatShortDate } from "@/lib/dates";
import { StatusPill, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      certificates: {
        include: { template: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!candidate) notFound();

  const totalCertificates = candidate.certificates.length;
  const issuedCertificates = candidate.certificates.filter((c) => c.status === "ISSUED").length;
  const revokedCertificates = candidate.certificates.filter((c) => c.status === "REVOKED").length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center gap-2 text-small text-ink-muted">
        <Link href="/candidates" className="hover:underline">Candidates</Link>
        <span>/</span>
        <span className="text-ink font-medium">{candidate.name}</span>
      </div>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="font-record text-3xl font-semibold">
            {candidate.title ? `${candidate.title} ` : ""}{candidate.name}
          </h1>
          <p className="mt-1 text-small text-ink-muted">
            Candidate ID: <span className="font-mono text-micro text-ink">{candidate.id}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <LinkButton
            href={`/certificates/create?name=${encodeURIComponent(candidate.name)}&title=${encodeURIComponent(candidate.title ?? "")}&email=${encodeURIComponent(candidate.email ?? "")}&phone=${encodeURIComponent(candidate.phone ?? "")}`}
            variant="primary"
          >
            + Issue New Certificate
          </LinkButton>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-rule bg-white p-4 shadow-sm">
          <p className="text-micro font-medium text-ink-muted uppercase">Total Certificates</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{totalCertificates}</p>
        </div>
        <div className="rounded-lg border border-rule bg-white p-4 shadow-sm">
          <p className="text-micro font-medium text-ink-muted uppercase">Active & Valid</p>
          <p className="mt-1 text-2xl font-semibold text-valid">{issuedCertificates}</p>
        </div>
        <div className="rounded-lg border border-rule bg-white p-4 shadow-sm">
          <p className="text-micro font-medium text-ink-muted uppercase">Revoked</p>
          <p className="mt-1 text-2xl font-semibold text-seal">{revokedCertificates}</p>
        </div>
        <div className="rounded-lg border border-rule bg-white p-4 shadow-sm">
          <p className="text-micro font-medium text-ink-muted uppercase">Candidate Since</p>
          <p className="mt-1 text-lg font-medium text-ink">{formatShortDate(candidate.createdAt)}</p>
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-rule bg-white p-6 shadow-sm">
        <h2 className="text-small font-semibold text-ink-soft uppercase tracking-wider">
          Contact Details
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-micro text-ink-muted">Full Name</dt>
            <dd className="mt-1 text-small font-medium text-ink">
              {candidate.title ? `${candidate.title} ` : ""}{candidate.name}
            </dd>
          </div>
          <div>
            <dt className="text-micro text-ink-muted">Email Address</dt>
            <dd className="mt-1 text-small text-ink">{candidate.email ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-micro text-ink-muted">Phone Number</dt>
            <dd className="mt-1 text-small text-ink">{candidate.phone ?? "Not provided"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-record font-semibold text-ink">Certificates History</h2>
          <span className="text-small text-ink-muted">{totalCertificates} issued</span>
        </div>

        {totalCertificates === 0 ? (
          <p className="mt-4 text-small text-ink-muted">No certificates have been issued yet for this candidate.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-rule bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-small">
              <thead>
                <tr className="border-b border-rule bg-paper text-micro font-medium text-ink-muted">
                  <th className="px-4 py-3">Certificate ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Internship Period</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {candidate.certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-paper/50">
                    <td className="px-4 py-3 font-mono font-medium">
                      <Link href={`/certificates/${cert.id}`} className="text-ink hover:underline">
                        {cert.certificateNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink">{cert.role}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {formatShortDate(cert.startDate)} – {formatShortDate(cert.endDate)}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatPlainDate(cert.issueDate)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={cert.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/certificates/${cert.id}`}
                          className="rounded border border-rule bg-white px-2.5 py-1 text-micro font-medium text-ink hover:border-ink-muted"
                        >
                          View
                        </Link>
                        <Link
                          href={`/certificates/${cert.id}/preview`}
                          className="rounded border border-rule bg-white px-2.5 py-1 text-micro font-medium text-ink hover:border-ink-muted"
                        >
                          Preview
                        </Link>
                        {cert.pdfKey && (
                          <a
                            href={`/api/certificates/${cert.id}/pdf`}
                            download
                            className="rounded bg-ink px-2.5 py-1 text-micro font-medium text-white hover:bg-ink-soft"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
