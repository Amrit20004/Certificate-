import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Templates — Nextute" };

export default async function TemplatesPage() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const templates = await prisma.template.findMany({
    include: { _count: { select: { certificates: true } } },
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-record text-2xl">Templates</h1>
      <p className="mt-1 max-w-measure text-small text-ink-muted">
        A template is the finished certificate design plus a map of where each value is printed on it.
        Changing a design means adding a new version, never editing a published one — certificates
        already issued keep the version they were built with.
      </p>

      {templates.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No templates registered"
            body="Run the seed script, or add a template row pointing at the background PDF in storage and its coordinate map."
          />
        </div>
      ) : (
        <ul className="mt-6 border-t border-rule">
          {templates.map((template) => (
            <li key={template.id} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule py-4">
              <div>
                <Link href={`/templates/${template.id}`} className="font-medium text-ink hover:underline">
                  {template.name} <span className="tabular text-ink-muted">v{template.version}</span>
                </Link>
                <p className="mt-0.5 text-micro text-ink-muted">{template.fileKey}</p>
              </div>
              <div className="flex items-center gap-3 text-small text-ink-muted">
                <span>{template._count.certificates} issued</span>
                {template.isActive ? <span className="rounded-full bg-valid/10 px-2 py-0.5 text-micro font-medium text-valid">Active</span> : null}
                <Link
                  href={`/templates/${template.id}`}
                  className="rounded border border-rule bg-white px-2.5 py-1 text-micro font-medium text-ink hover:border-ink-muted"
                >
                  View Details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 max-w-measure text-small text-ink-muted">
        Coordinates live in <span className="tabular">templates/internship-v1.json</span>. Use{" "}
        <span className="tabular">npm run template:probe</span> to print a measuring grid over the
        design and read off the positions.
      </p>
    </div>
  );
}
