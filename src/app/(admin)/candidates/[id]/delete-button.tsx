"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteCandidateButton({
  candidateId,
  candidateName,
}: {
  candidateId: string;
  candidateName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete candidate");
      }

      router.push("/candidates");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-seal/30 bg-white px-3.5 py-2 text-small font-medium text-seal shadow-sm transition hover:bg-seal-tint hover:border-seal"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete Candidate
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-rule bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-seal">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-seal-tint">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-seal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="font-record text-lg font-semibold text-ink">
                Delete Candidate Data
              </h3>
            </div>

            <p className="mt-3 text-small text-ink-muted leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-ink">{candidateName}</strong>?
            </p>
            <p className="mt-2 text-micro text-ink-muted bg-seal-tint/40 p-3 rounded border border-seal/20">
              ⚠️ This will permanently remove their profile, contact details, any associated certificates, and audit logs. This action cannot be undone.
            </p>

            {error && (
              <p className="mt-3 rounded bg-red-50 p-2 text-micro text-red-600 border border-red-200">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="rounded-md border border-rule bg-white px-4 py-2 text-small font-medium text-ink hover:bg-paper transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDelete}
                className="inline-flex items-center justify-center rounded-md bg-seal px-4 py-2 text-small font-medium text-white shadow-sm hover:bg-seal/90 transition disabled:opacity-60"
              >
                {loading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
