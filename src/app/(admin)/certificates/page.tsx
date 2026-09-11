import Link from "next/link";
import { searchCertificates } from "@/server/certificates";
import { prisma } from "@/lib/prisma";
import { formatShortDate } from "@/lib/dates";
import { verificationUrl } from "@/lib/qr";
import { EmptyState, LinkButton, StatusPill } from "@/components/ui";
import { CertificateRowActions } from "./row-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificates — Nextute" };

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [result, templates] = await Promise.all([
    searchCertificates({
      q: params.q,
      status: params.status as "ISSUED" | "REVOKED" | "DRAFT" | undefined,
      year: params.year ? Number(params.year) : undefined,
      templateId: params.templateId,
      from: params.from,
      to: params.to,
      page: params.page ? Number(params.page) : 1,
    }),
    prisma.template.findMany({
      select: { id: true, name: true, version: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const hasFilters = Boolean(
    params.q || params.status || params.year || params.templateId || params.from || params.to
  );

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-record text-2xl font-semibold">Certificates</h1>
          <p className="mt-1 text-small text-ink-muted">
            {result.total.toLocaleString("en-IN")} record{result.total === 1 ? "" : "s"} found
          </p>
        </div>
        <LinkButton href="/certificates/create" variant="primary">
          + Create Certificate
        </LinkButton>
      </header>

      {/* Advanced Search & Multi-Filter Console */}
      <div className="mt-6 rounded-lg border border-rule bg-white p-4 shadow-xs">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" action="/certificates">
          <div className="lg:col-span-2">
            <label className="field-label text-micro" htmlFor="q">Search</label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Candidate name, ID, email or role"
              className="field-input text-small"
              aria-label="Search certificates"
            />
          </div>

          <div>
            <label className="field-label text-micro" htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              defaultValue={params.status ?? ""}
              className="field-input text-small"
              aria-label="Status"
            >
              <option value="">All Statuses</option>
              <option value="ISSUED">Issued</option>
              <option value="REVOKED">Revoked</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div>
            <label className="field-label text-micro" htmlFor="templateId">Template</label>
            <select
              id="templateId"
              name="templateId"
              defaultValue={params.templateId ?? ""}
              className="field-input text-small"
              aria-label="Template"
            >
              <option value="">All Templates</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} (v{tpl.version})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 rounded border border-rule bg-paper px-3 py-2 text-small font-medium text-ink hover:border-ink-muted hover:bg-white"
            >
              Filter
            </button>
            {hasFilters && (
              <Link
                href="/certificates"
                className="rounded border border-transparent px-2.5 py-2 text-micro text-ink-muted hover:text-ink hover:underline"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {result.items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={hasFilters ? "No certificates match your search filters" : "No certificates issued yet"}
            body={
              hasFilters
                ? "Try adjusting search terms or removing some filters to see matching certificate records."
                : "Create the first certificate using the button above to issue an official Nextute credential."
            }
            action={
              hasFilters ? (
                <LinkButton href="/certificates">Clear all filters</LinkButton>
              ) : (
                <LinkButton href="/certificates/create" variant="primary">
                  + Create certificate
                </LinkButton>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-lg border border-rule bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-small">
              <thead>
                <tr className="border-b border-rule bg-paper text-micro font-medium text-ink-muted">
                  <th className="px-4 py-3 font-semibold">Certificate ID</th>
                  <th className="px-4 py-3 font-semibold">Candidate</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Role</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Internship Period</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {result.items.map((certificate) => (
                  <tr key={certificate.id} className="hover:bg-paper/40">
                    <td className="px-4 py-3 font-mono font-medium">
                      <Link
                        href={`/certificates/${certificate.id}`}
                        className="tabular text-ink hover:underline"
                      >
                        {certificate.certificateNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/candidates/${certificate.candidateId}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {certificate.candidate.name}
                      </Link>
                      {certificate.candidate.email ? (
                        <div className="text-micro text-ink-muted">{certificate.candidate.email}</div>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-muted sm:table-cell">
                      {certificate.role}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                      {formatShortDate(certificate.startDate)} – {formatShortDate(certificate.endDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={certificate.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CertificateRowActions
                        certificateId={certificate.id}
                        verificationUrl={verificationUrl(certificate.verificationToken)}
                        hasPdf={Boolean(certificate.pdfKey)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.pages > 1 ? (
            <nav className="mt-5 flex items-center justify-between text-small" aria-label="Pagination">
              <span className="text-ink-muted">
                Showing page {result.page} of {result.pages}
              </span>
              <div className="flex gap-2">
                {result.page > 1 ? (
                  <Link
                    href={`/certificates?${new URLSearchParams({ ...params, page: String(result.page - 1) } as Record<string, string>)}`}
                    className="rounded border border-rule bg-white px-3 py-1.5 hover:border-ink-muted"
                  >
                    Previous
                  </Link>
                ) : null}
                {result.page < result.pages ? (
                  <Link
                    href={`/certificates?${new URLSearchParams({ ...params, page: String(result.page + 1) } as Record<string, string>)}`}
                    className="rounded border border-rule bg-white px-3 py-1.5 hover:border-ink-muted"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
