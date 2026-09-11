import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "quiet";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft disabled:bg-ink-muted",
  secondary: "border border-rule bg-white text-ink hover:border-ink-muted",
  danger: "bg-seal text-white hover:opacity-90",
  quiet: "text-ink-muted hover:text-ink",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-small font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button {...props} className={`${BASE} ${VARIANTS[variant]} ${className}`} />;
}

export function LinkButton({
  href, variant = "secondary", className = "", children,
}: { href: string; variant?: ButtonVariant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ISSUED: "bg-valid-tint text-valid",
    REVOKED: "bg-seal-tint text-seal",
    DRAFT: "bg-caution-tint text-caution",
  };
  const labels: Record<string, string> = { ISSUED: "Issued", REVOKED: "Revoked", DRAFT: "Draft" };
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-micro font-medium ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-l-2 border-rule pl-4">
      <div className="tabular text-3xl font-medium">{value}</div>
      <div className="mt-0.5 text-small text-ink-muted">{label}</div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-rule bg-white px-6 py-14 text-center">
      <p className="font-record text-lg">{title}</p>
      <p className="mx-auto mt-2 max-w-measure text-small text-ink-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = "caution", children }: { tone?: "caution" | "danger"; children: ReactNode }) {
  const styles =
    tone === "danger" ? "border-seal/30 bg-seal-tint text-seal" : "border-caution/30 bg-caution-tint text-caution";
  return <div className={`rounded border px-4 py-3 text-small ${styles}`}>{children}</div>;
}
