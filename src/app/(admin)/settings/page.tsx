import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings & System Audit — Nextute" };

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "User Logged In",
  LOGIN_FAILED: "Failed Login Attempt",
  CREATE_CERTIFICATE: "Certificate Record Created",
  GENERATE_CERTIFICATE: "PDF Compiled & Issued",
  UPDATE_CERTIFICATE: "Certificate Updated",
  DOWNLOAD_CERTIFICATE: "PDF Downloaded",
  REVOKE_CERTIFICATE: "Certificate Revoked",
  RESTORE_CERTIFICATE: "Certificate Restored",
  CREATE_USER: "Admin Account Created",
  CREATE_TEMPLATE: "Template Registered",
  ACTIVATE_TEMPLATE: "Template Activated",
};

export default async function SettingsPage() {
  const session = await auth();
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";

  const [users, auditLogs] = await Promise.all([
    isSuperAdmin
      ? prisma.user.findMany({
          select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
          orderBy: { createdAt: "asc" },
        })
      : [],
    isSuperAdmin
      ? prisma.auditLog.findMany({
          include: {
            user: { select: { name: true, email: true } },
            certificate: { select: { id: true, certificateNumber: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 25,
        })
      : [],
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header className="border-b border-rule pb-4">
        <h1 className="font-record text-2xl font-semibold">Settings &amp; Audit Logs</h1>
        <p className="mt-1 text-small text-ink-muted">
          Manage system administrators, security preferences, and inspect the immutable audit trail.
        </p>
      </header>

      {/* Account Info */}
      <section className="rounded-lg border border-rule bg-white p-6 shadow-xs">
        <h2 className="text-small font-semibold uppercase tracking-wider text-ink-soft">
          Current Administrator Session
        </h2>
        <dl className="mt-4 divide-y divide-rule/70 text-small">
          <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
            <dt className="text-ink-muted">Name</dt>
            <dd className="font-medium text-ink">{session?.user.name}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
            <dt className="text-ink-muted">Email</dt>
            <dd className="text-ink font-mono">{session?.user.email}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
            <dt className="text-ink-muted">Role</dt>
            <dd className="text-ink">
              <span className="rounded-full bg-paper px-2.5 py-0.5 text-micro font-medium text-ink">
                {isSuperAdmin ? "Super Admin" : "Administrator"}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* Admin Accounts */}
      {isSuperAdmin && (
        <section className="rounded-lg border border-rule bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-small font-semibold uppercase tracking-wider text-ink-soft">
              Provisioned Administrators
            </h2>
            <span className="text-micro text-ink-muted">{users.length} active account{users.length === 1 ? "" : "s"}</span>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-rule">
            <table className="w-full border-collapse bg-white text-small text-left">
              <thead>
                <tr className="border-b border-rule bg-paper text-micro font-medium text-ink-muted">
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="hidden px-3 py-2.5 sm:table-cell">Last Signed In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/70">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-paper/40">
                    <td className="px-3 py-2.5 font-medium text-ink">{user.name}</td>
                    <td className="px-3 py-2.5 font-mono text-micro text-ink-muted">{user.email}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded bg-paper px-2 py-0.5 text-micro font-medium">
                        {user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2.5 text-ink-muted sm:table-cell text-micro">
                      {user.lastLoginAt
                        ? user.lastLoginAt.toLocaleDateString("en-IN", { dateStyle: "medium" })
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-micro text-ink-muted">
            New admin accounts can be provisioned by modifying environment seeds or using the administrative API.
          </p>
        </section>
      )}

      {/* System Audit Log (Section 19) */}
      {isSuperAdmin && (
        <section className="rounded-lg border border-rule bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-small font-semibold uppercase tracking-wider text-ink-soft">
                System Audit Log
              </h2>
              <p className="mt-0.5 text-micro text-ink-muted">
                Immutable event stream for certificate generation, downloads, and revocations.
              </p>
            </div>
            <span className="text-micro font-mono text-ink-muted">Last 25 events</span>
          </div>

          {auditLogs.length === 0 ? (
            <p className="mt-4 text-small text-ink-muted">No audit events recorded yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-md border border-rule">
              <table className="w-full border-collapse bg-white text-small text-left">
                <thead>
                  <tr className="border-b border-rule bg-paper text-micro font-medium text-ink-muted">
                    <th className="px-3 py-2.5">Event Action</th>
                    <th className="px-3 py-2.5">User</th>
                    <th className="px-3 py-2.5">Target Certificate</th>
                    <th className="px-3 py-2.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/70 text-micro">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-paper/40">
                      <td className="px-3 py-2.5 font-medium text-ink">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink-muted">
                        {log.user?.email ?? "System"}
                      </td>
                      <td className="px-3 py-2.5 font-mono">
                        {log.certificate ? (
                          <Link href={`/certificates/${log.certificate.id}`} className="text-ink underline">
                            {log.certificate.certificateNumber}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-muted">
                        {log.createdAt.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
