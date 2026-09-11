import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/certificates", label: "Certificates", icon: "📜" },
  { href: "/candidates", label: "Candidates", icon: "👥" },
  { href: "/verification", label: "Verify Lookup", icon: "🔍" },
  { href: "/templates", label: "Templates", superAdminOnly: true, icon: "📐" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = NAV.filter((item) => !item.superAdminOnly || session.user.role === "SUPER_ADMIN");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[16rem_1fr] bg-paper">
      <aside className="border-b border-rule bg-white md:border-b-0 md:border-r flex flex-col justify-between">
        <div>
          {/* Header Branding */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-rule/60">
            <div className="relative h-9 w-9 overflow-hidden rounded-md border border-rule bg-white shadow-xs">
              <Image
                src="/nextute_logo.jpg"
                alt="Nextute Logo"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-record text-lg font-bold tracking-tight text-ink leading-tight">NEXTUTE</p>
              <p className="text-micro font-medium text-ink-muted">Certificate Registry</p>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex gap-1 overflow-x-auto p-3 md:mt-2 md:flex-col md:overflow-visible">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-small font-medium text-ink-soft hover:bg-paper hover:text-ink transition-colors"
              >
                <span className="text-sm">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="border-t border-rule p-4 bg-paper/50">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-semibold text-ink">{session.user.name}</p>
              <p className="truncate text-micro text-ink-muted">
                {session.user.role === "SUPER_ADMIN" ? "Super Admin" : "Administrator"}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-3"
          >
            <button
              type="submit"
              className="w-full text-left rounded border border-rule/70 bg-white px-2.5 py-1.5 text-micro font-medium text-ink-soft hover:border-ink-muted hover:text-ink transition-all shadow-2xs"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="px-5 py-8 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
