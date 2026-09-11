import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/server/certificates";
import { formatShortDate } from "@/lib/dates";
import { EmptyState, LinkButton, Stat, StatusPill } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-record text-2xl">Welcome back, {session?.user.name?.split(" ")[0]}</h1>
          <p className="mt-1 text-small text-ink-muted">Everything issued under Nextute Edtech Pvt. Ltd.</p>
        </div>
        <LinkButton href="/certificates/create" variant="primary">Create certificate</LinkButton>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="Certificates issued" value={stats.total.toLocaleString("en-IN")} />
        <Stat label="Issued this month" value={stats.thisMonth.toLocaleString("en-IN")} />
        <Stat label="Candidates" value={stats.candidates.toLocaleString("en-IN")} />
        <Stat label="Revoked" value={stats.revoked.toLocaleString("en-IN")} />
      </section>

      <section className="mt-10">
        <h2 className="text-small font-medium text-ink-soft">Recently issued</h2>
        {stats.recent.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No certificates yet"
              body="Once you issue the first certificate it appears here with its verification link."
              action={<LinkButton href="/certificates/create" variant="primary">Create certificate</LinkButton>}
            />
          </div>
        ) : (
          <table className="mt-3 w-full border-collapse bg-white text-small">
            <thead>
              <tr className="border-y border-rule text-left text-micro text-ink-muted">
                <th className="px-3 py-2 font-medium">Certificate</th>
                <th className="px-3 py-2 font-medium">Candidate</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Role</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">Period</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((certificate) => (
                <tr key={certificate.id} className="border-b border-rule">
                  <td className="px-3 py-2.5">
                    <Link href={`/certificates/${certificate.id}`} className="tabular underline underline-offset-2">
                      {certificate.certificateNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{certificate.candidate.name}</td>
                  <td className="hidden px-3 py-2.5 text-ink-muted sm:table-cell">{certificate.role}</td>
                  <td className="hidden px-3 py-2.5 text-ink-muted md:table-cell">
                    {formatShortDate(certificate.startDate)} – {formatShortDate(certificate.endDate)}
                  </td>
                  <td className="px-3 py-2.5"><StatusPill status={certificate.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
