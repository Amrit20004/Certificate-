import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      _count: { select: { certificates: true } },
    },
  });

  if (!template) notFound();

  const config = typeof template.config === "string" 
    ? JSON.parse(template.config) 
    : template.config;

  const fields = config?.fields ?? {};

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-2 text-small text-ink-muted">
        <Link href="/templates" className="hover:underline">Templates</Link>
        <span>/</span>
        <span className="text-ink font-medium">{template.name} v{template.version}</span>
      </div>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-record text-3xl font-semibold">{template.name}</h1>
            <span className="rounded bg-paper px-2.5 py-0.5 text-small font-mono text-ink-muted">
              v{template.version}
            </span>
            {template.isActive && (
              <span className="rounded-full bg-valid/10 px-2.5 py-0.5 text-micro font-medium text-valid">
                Active
              </span>
            )}
          </div>
          <p className="mt-1 text-small text-ink-muted">
            Storage Key: <code className="text-micro font-mono text-ink">{template.fileKey}</code>
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-ink">{template._count.certificates}</p>
          <p className="text-micro text-ink-muted">Certificates Generated</p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-rule bg-white p-4 shadow-sm">
          <p className="text-micro font-medium text-ink-muted uppercase">Coordinate Origin</p>
          <p className="mt-1 text-base font-semibold text-ink font-mono">{config?.origin ?? "top-left"}</p>
        </div>
        <div className="rounded-lg border border-rule bg-white p-4 shadow-sm">
          <p className="text-micro font-medium text-ink-muted uppercase">Active Fonts</p>
          <p className="mt-1 text-base font-semibold text-ink">
            {Object.keys(config?.fonts ?? {}).join(", ") || "Standard"}
          </p>
        </div>
        <div className="rounded-lg border border-rule bg-white p-4 shadow-sm">
          <p className="text-micro font-medium text-ink-muted uppercase">Configured Fields</p>
          <p className="mt-1 text-base font-semibold text-ink">{Object.keys(fields).length} fields mapped</p>
        </div>
      </div>

      {/* Field coordinates map */}
      <section className="mt-8">
        <h2 className="text-lg font-record font-semibold text-ink">Field Coordinate Mapping</h2>
        <p className="mt-1 text-small text-ink-muted">
          Developer-controlled exact X/Y positioning and font sizing for PDF generation.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-rule bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-small">
            <thead>
              <tr className="border-b border-rule bg-paper text-micro font-medium text-ink-muted">
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 font-mono">X, Y</th>
                <th className="px-4 py-3 font-mono">Max Width</th>
                <th className="px-4 py-3">Font / Size</th>
                <th className="px-4 py-3">Color</th>
                <th className="px-4 py-3">Align</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule font-mono text-micro">
              {Object.entries(fields).map(([fieldName, f]: [string, any]) => (
                <tr key={fieldName} className="hover:bg-paper/50">
                  <td className="px-4 py-3 font-sans font-medium text-ink">{fieldName}</td>
                  <td className="px-4 py-3 text-ink-muted">{f.type}</td>
                  <td className="px-4 py-3 text-ink">({f.x}, {f.y})</td>
                  <td className="px-4 py-3 text-ink-muted">{f.maxWidth ?? f.width ?? "—"}</td>
                  <td className="px-4 py-3 text-ink">
                    {f.font ?? "—"} ({f.size ? `${f.size}pt` : "—"})
                  </td>
                  <td className="px-4 py-3">
                    {f.color ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-3 w-3 rounded-full border border-rule" style={{ backgroundColor: f.color }} />
                        {f.color}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{f.align ?? "left"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Raw JSON */}
      <section className="mt-8">
        <h2 className="text-small font-semibold text-ink-soft uppercase tracking-wider">
          Raw Template Specification (JSON)
        </h2>
        <div className="mt-2 rounded-lg border border-rule bg-[#0F172A] p-4 text-micro font-mono text-slate-200 overflow-x-auto">
          <pre>{JSON.stringify(config, null, 2)}</pre>
        </div>
      </section>
    </div>
  );
}
