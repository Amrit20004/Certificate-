"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function VerificationConsolePage() {
  const router = useRouter();
  const [certId, setCertId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = certId.trim();
    if (!query) {
      setError("Please enter a Certificate ID or verification token.");
      return;
    }
    setError(null);
    router.push(`/verify/${encodeURIComponent(query)}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="border-b border-rule pb-4">
        <h1 className="font-record text-2xl font-semibold">Certificate Verification Console</h1>
        <p className="mt-1 text-small text-ink-muted">
          Lookup and verify the public authenticity status of any Nextute certificate record.
        </p>
      </header>

      <div className="mt-8 rounded-lg border border-rule bg-white p-6 shadow-sm">
        <form onSubmit={handleSearch}>
          <label htmlFor="certId" className="block text-small font-medium text-ink-soft">
            Enter Certificate ID or Verification Token
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="certId"
              type="text"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              placeholder="e.g. NXT-INT-2026-000001"
              className="field-input font-mono flex-1 text-[0.9375rem]"
              autoFocus
            />
            <Button type="submit">Verify Now</Button>
          </div>
          {error && <p className="field-error mt-2">{error}</p>}
        </form>

        <div className="mt-6 rounded-md bg-paper p-4 text-micro text-ink-muted">
          <p className="font-medium text-ink">Accepted Formats:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              Official Certificate Number: <code className="font-mono text-ink">NXT-INT-YYYY-XXXXXX</code>
            </li>
            <li>
              Cryptographic Token: <code className="font-mono text-ink">24-character token from QR code</code>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-small font-semibold text-ink-soft uppercase tracking-wider">
          Verification Mechanics
        </h2>
        <div className="mt-3 space-y-3 text-small text-ink-muted">
          <div className="rounded border border-rule bg-white p-4">
            <p className="font-medium text-ink">1. Public Endpoint</p>
            <p className="mt-1">
              Public verification links at <code className="text-micro font-mono">/verify/[id]</code> require no login
              and can be accessed directly by students, recruiters, and background checking agencies.
            </p>
          </div>
          <div className="rounded border border-rule bg-white p-4">
            <p className="font-medium text-ink">2. Tamper-Proof QR Codes</p>
            <p className="mt-1">
              Every certificate PDF contains a dynamically generated high-resolution QR code pointing to this verification endpoint.
            </p>
          </div>
          <div className="rounded border border-rule bg-white p-4">
            <p className="font-medium text-ink">3. Real-Time Status & Revocation</p>
            <p className="mt-1">
              If a certificate is revoked by an authorized administrator, the verification status immediately updates to <span className="font-medium text-seal">REVOKED</span> with the audit-stamped timestamp and reason.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
