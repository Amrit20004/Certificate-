import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Candidates — Nextute" };

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const candidates = await prisma.candidate.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    include: { _count: { select: { certificates: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-record text-2xl">Candidates</h1>
      <p className="mt-1 text-small text-ink-muted">Everyone who has been issued a certificate.</p>

      <form className="mt-6 flex gap-3" action="/candidates">
        <input
          name="q" defaultValue={q ?? ""} placeholder="Name or email"
          className="field-input max-w-sm" aria-label="Search candidates"
        />
        <button type="submit" className="rounded border border-rule bg-white px-4 py-2 text-small font-medium hover:border-ink-muted">
          Search
        </button>
      </form>

      {candidates.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No candidates" body="Candidates are added automatically when you issue their first certificate." />
        </div>
      ) : (
        <table className="mt-6 w-full border-collapse bg-white text-small">
          <thead>
            <tr className="border-y border-rule text-left text-micro text-ink-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Email</th>
              <th className="px-3 py-2 font-medium">Certificates</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="border-b border-rule hover:bg-paper/50 transition">
                <td className="px-3 py-2.5">
                  <Link
                    href={`/candidates/${candidate.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {candidate.title ? `${candidate.title} ` : ""}{candidate.name}
                  </Link>
                </td>
                <td className="hidden px-3 py-2.5 text-ink-muted sm:table-cell">{candidate.email ?? "—"}</td>
                <td className="tabular px-3 py-2.5">{candidate._count.certificates}</td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    href={`/candidates/${candidate.id}`}
                    className="inline-flex items-center rounded border border-rule bg-white px-2.5 py-1 text-micro font-medium text-ink hover:border-ink-muted"
                  >
                    Manage / Delete →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
