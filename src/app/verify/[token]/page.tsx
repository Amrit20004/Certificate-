import type { Metadata } from "next";
import Image from "next/image";
import { verifyByToken } from "@/server/certificates";
import { formatPlainDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certificate Verification — Nextute Edtech Pvt. Ltd.",
  description: "Official public certificate authenticity verification portal for Nextute Edtech Pvt. Ltd.",
  robots: { index: false, follow: false },
};

function Entry({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-rule/70 py-3.5 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[1.0625rem] font-medium text-ink sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-10 sm:py-16">
      <div className="flex-1">
        <header className="flex items-center gap-3.5 border-b border-ink/20 pb-4">
          <div className="relative h-11 w-11 overflow-hidden rounded-md border border-rule bg-white shadow-2xs">
            <Image
              src="/nextute_logo.jpg"
              alt="Nextute Edtech Logo"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-record text-xl font-bold tracking-tight text-ink leading-tight">NEXTUTE</p>
            <p className="text-small text-ink-muted">Certificate Verification Registry</p>
          </div>
        </header>
        {children}
      </div>
      <footer className="mt-12 border-t border-rule pt-4 text-micro leading-relaxed text-ink-muted text-center sm:text-left">
        <p className="font-semibold text-ink-soft">Nextute Edtech Pvt. Ltd.</p>
        <p className="mt-1">
          This page is the authoritative public verification record for certificates issued by Nextute Edtech Pvt. Ltd.
          A printed or digital certificate that does not resolve to an active valid record on this registry is not authentic.
        </p>
      </footer>
    </main>
  );
}

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const certificate = await verifyByToken(token);

  if (!certificate) {
    return (
      <Shell>
        <div className="mt-8 rounded-lg border-2 border-seal/30 bg-seal-tint p-6 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-seal text-2xl font-bold text-white shadow-sm">
            ✕
          </div>
          <h1 className="mt-4 font-record text-2xl font-bold tracking-tight text-seal">
            CERTIFICATE NOT FOUND
          </h1>
          <p className="mt-2 text-small leading-relaxed text-ink-soft">
            The certificate number or verification link entered could not be verified in our records.
          </p>
          <div className="mt-5 rounded border border-seal/20 bg-white p-3 text-micro text-ink-muted">
            Check that the full code was entered accurately. If you believe this is an error, contact{" "}
            <a href="mailto:hr@nextute.com" className="font-medium text-seal underline">hr@nextute.com</a>.
          </div>
        </div>
      </Shell>
    );
  }

  const revoked = certificate.status === "REVOKED";
  const fullName = certificate.candidate.title
    ? `${certificate.candidate.title} ${certificate.candidate.name}`
    : certificate.candidate.name;

  return (
    <Shell>
      {revoked ? (
        <div className="mt-8 rounded-lg border-2 border-seal/30 bg-seal-tint p-6 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-seal text-2xl font-bold text-white shadow-sm">
            ⚠
          </div>
          <h1 className="mt-4 font-record text-2xl font-bold tracking-tight text-seal">
            CERTIFICATE REVOKED
          </h1>
          <p className="mt-2 text-small leading-relaxed text-ink-soft">
            This certificate was issued by Nextute Edtech Pvt. Ltd. and has since been withdrawn. It is no longer considered valid proof of internship.
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-lg border-2 border-valid/30 bg-valid-tint p-6 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-valid text-2xl font-bold text-white shadow-sm">
            ✓
          </div>
          <h1 className="mt-4 font-record text-2xl font-bold tracking-tight text-valid">
            CERTIFICATE VALID
          </h1>
          <p className="mt-2 text-small leading-relaxed text-ink-soft">
            This certificate was authentically issued by Nextute Edtech Pvt. Ltd. and is in good standing.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-lg border border-rule bg-white p-6 shadow-xs">
        <h2 className="text-micro font-bold uppercase tracking-wider text-ink-muted">
          Credential Details
        </h2>
        <p className="mt-3 font-record text-2xl font-bold text-ink sm:text-3xl">
          {fullName}
        </p>

        <dl className="mt-6 border-t border-rule/70">
          <Entry label="Candidate">{fullName}</Entry>
          <Entry label="Internship Role">{certificate.role}</Entry>
          <Entry label="Internship Duration">
            {formatPlainDate(certificate.startDate)} – {formatPlainDate(certificate.endDate)}
          </Entry>
          <Entry label="Certificate ID">
            <span className="tabular font-mono font-semibold">{certificate.certificateNumber}</span>
          </Entry>
          <Entry label="Issued By">Nextute Edtech Pvt. Ltd.</Entry>
          <Entry label="Issued On">{formatPlainDate(certificate.issueDate)}</Entry>
          {revoked && certificate.revokedAt ? (
            <Entry label="Withdrawn On">{formatPlainDate(certificate.revokedAt)}</Entry>
          ) : null}
        </dl>
      </div>
    </Shell>
  );
}
