"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface Props {
  certificateId: string;
  certificateNumber: string;
  verificationUrl: string;
  status: string;
  canRevoke: boolean;
  canRegenerate: boolean;
  hasPdf: boolean;
}

export function CertificateActions({
  certificateId, certificateNumber, verificationUrl, status, canRevoke, canRegenerate, hasPdf,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body?: unknown) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "That did not work. Try again.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("That did not work. Check your connection and try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {hasPdf ? (
          <>
            <a
              href={`/api/certificates/${certificateId}/pdf`}
              className="inline-flex items-center rounded bg-ink px-4 py-2 text-small font-medium text-white hover:bg-ink-soft"
            >
              Download PDF
            </a>
            <a
              href={`/api/certificates/${certificateId}/pdf?inline=1`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded border border-rule bg-white px-4 py-2 text-small font-medium hover:border-ink-muted"
            >
              Open PDF
            </a>
          </>
        ) : null}

        <Button
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(verificationUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Link copied" : "Copy verification link"}
        </Button>

        {canRegenerate && status !== "REVOKED" ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => post(`/api/certificates/${certificateId}/regenerate`)}
          >
            Rebuild PDF
          </Button>
        ) : null}

        {canRevoke && status !== "REVOKED" ? (
          <Button variant="quiet" onClick={() => setRevoking(true)}>Revoke</Button>
        ) : null}
      </div>

      {error ? <p className="field-error" role="alert">{error}</p> : null}

      {revoking ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-5"
        >
          <div className="w-full max-w-md rounded bg-white p-6">
            <h2 id="revoke-heading" className="font-record text-xl">Revoke this certificate?</h2>
            <p className="mt-2 text-small text-ink-muted">
              <span className="tabular">{certificateNumber}</span> will show as revoked on its
              verification page, including for QR codes already printed. The PDF stays on file and
              the reason is recorded permanently.
            </p>

            <label className="field-label mt-5" htmlFor="reason">Reason</label>
            <textarea
              id="reason" rows={3} className="field-input" value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Issued with the wrong internship period"
            />

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setRevoking(false)} disabled={pending}>
                Keep it valid
              </Button>
              <Button
                variant="danger"
                disabled={pending || reason.trim().length < 5}
                onClick={async () => {
                  const ok = await post(`/api/certificates/${certificateId}/revoke`, { reason });
                  if (ok) setRevoking(false);
                }}
              >
                {pending ? "Revoking" : "Revoke certificate"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
