"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  certificateId: string;
  verificationUrl: string;
  hasPdf: boolean;
}

export function CertificateRowActions({ certificateId, verificationUrl, hasPdf }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap text-micro font-medium">
      <Link
        href={`/certificates/${certificateId}`}
        className="rounded px-2 py-1 text-ink-soft hover:bg-paper hover:text-ink"
        title="View full record"
      >
        View
      </Link>
      <Link
        href={`/certificates/${certificateId}/preview`}
        className="rounded px-2 py-1 text-ink-soft hover:bg-paper hover:text-ink"
        title="Preview document"
      >
        Preview
      </Link>
      {hasPdf && (
        <a
          href={`/api/certificates/${certificateId}/pdf`}
          download
          className="rounded px-2 py-1 text-ink font-semibold hover:bg-paper"
          title="Download official PDF"
        >
          PDF
        </a>
      )}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(verificationUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="rounded px-2 py-1 text-ink-muted hover:bg-paper hover:text-ink"
        title="Copy public verification link"
      >
        {copied ? "✓ Copied" : "Copy Link"}
      </button>
    </div>
  );
}
