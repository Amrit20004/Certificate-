import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Nextute Certificate Management" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-sm rounded-xl border border-rule bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3 h-14 w-14 overflow-hidden rounded-lg border border-rule shadow-xs">
            <Image
              src="/nextute_logo.jpg"
              alt="Nextute Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="font-record text-2xl font-bold tracking-tight text-ink">NEXTUTE</h1>
          <p className="mt-1 text-small font-medium text-ink-muted">Certificate Management</p>
        </div>

        <LoginForm next={next} />

        <div className="mt-6 rounded-md bg-paper p-3 text-center text-micro text-ink-muted">
          <p>No public registration.</p>
          <p className="mt-0.5">Admin accounts are provisioned by an existing Super Admin.</p>
        </div>
      </div>
    </main>
  );
}
