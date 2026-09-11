import { prisma } from "@/lib/prisma";
import { EmptyState, LinkButton } from "@/components/ui";
import { CreateCertificateForm } from "./create-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create certificate — Nextute" };

export default async function CreateCertificatePage() {
  const templates = await prisma.template.findMany({
    where: { isActive: true },
    select: { id: true, name: true, version: true },
    orderBy: [{ name: "asc" }, { version: "desc" }],
  });

  if (templates.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="No active template"
          body="A certificate needs a background design and its coordinate map before it can be issued. A super admin can upload one under Templates."
          action={<LinkButton href="/templates">Go to templates</LinkButton>}
        />
      </div>
    );
  }

  return <CreateCertificateForm templates={templates} />;
}
