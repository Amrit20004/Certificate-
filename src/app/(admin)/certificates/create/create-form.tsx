"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Notice } from "@/components/ui";
import { TITLES } from "@/lib/certificate-text";

interface TemplateOption {
  id: string;
  name: string;
  version: number;
}

interface Duplicate {
  id: string;
  certificateNumber: string;
  candidateName: string;
  role: string;
  startDate: string;
  endDate: string;
}

interface Issued {
  id: string;
  certificateNumber: string;
  verificationUrl: string;
  warnings: string[];
}

type Step = "form" | "preview" | "done";

const today = new Date().toISOString().slice(0, 10);

export function CreateCertificateForm({ templates }: { templates: TemplateOption[] }) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("form");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState(false);

  const [values, setValues] = useState({
    candidateName: searchParams.get("name") ?? "",
    title: (searchParams.get("title") || "Mr.") as string,
    email: searchParams.get("email") ?? "",
    phone: searchParams.get("phone") ?? "",
    role: "",
    startDate: "",
    endDate: "",
    issueDate: today,
    templateId: templates[0]?.id ?? "",
    signatory: "Director",
  });

  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [previewUrl]);

  function update(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function payload(confirmDuplicate = false) {
    return { ...values, confirmDuplicate };
  }

  async function readError(response: Response) {
    const data = await response.json().catch(() => ({}));
    setFieldErrors(data.fields ?? {});
    setFormError(data.error ?? "Something went wrong. Try again.");
  }

  async function handlePreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const [previewResponse, duplicateResponse] = await Promise.all([
        fetch("/api/certificates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        }),
        fetch("/api/certificates/duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        }),
      ]);

      if (!previewResponse.ok) {
        await readError(previewResponse);
        return;
      }

      const blob = await previewResponse.blob();
      setPreviewUrl(URL.createObjectURL(blob));
      setDuplicates(duplicateResponse.ok ? (await duplicateResponse.json()).matches ?? [] : []);
      setStep("preview");
    } catch {
      setFormError("Could not build the preview. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleGenerate() {
    setPending(true);
    setFormError(null);

    try {
      const response = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(duplicates.length > 0)),
      });

      if (!response.ok) {
        await readError(response);
        setStep("form");
        return;
      }
      setIssued(await response.json());
      setStep("done");
    } catch {
      setFormError("The certificate was not issued. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (step === "done" && issued) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-valid/30 bg-valid-tint p-6 shadow-sm">
          <p className="text-small font-semibold text-valid uppercase tracking-wider">
            ✓ Certificate Generated Successfully
          </p>
          <p className="mt-2 text-micro text-ink-muted">Certificate ID:</p>
          <h1 className="tabular font-record text-3xl font-bold text-ink">{issued.certificateNumber}</h1>
          <p className="mt-2 text-small text-ink-muted">
            The official PDF has been compiled and saved. The dynamic verification link and QR code are now live and active.
          </p>

          {issued.warnings.length > 0 ? (
            <div className="mt-4">
              <Notice>
                <p className="font-medium">Notice on document fitting:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  {issued.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </Notice>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`/api/certificates/${issued.id}/pdf`}
              download
              className="inline-flex items-center rounded-md bg-ink px-4 py-2 text-small font-medium text-white hover:bg-ink-soft shadow-xs"
            >
              Download PDF
            </a>
            <Link
              href={`/certificates/${issued.id}`}
              className="inline-flex items-center rounded-md border border-rule bg-white px-4 py-2 text-small font-medium text-ink hover:border-ink-muted shadow-xs"
            >
              View Certificate
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(issued.verificationUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "✓ Copied to clipboard" : "Copy Verification Link"}
            </Button>
          </div>

          <div className="mt-6 border-t border-rule/60 pt-4">
            <p className="text-micro text-ink-muted">
              Public verification link:{" "}
              <a href={issued.verificationUrl} target="_blank" rel="noreferrer" className="tabular font-mono text-ink underline underline-offset-2 break-all">
                {issued.verificationUrl}
              </a>
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Link href="/certificates/create" className="text-small font-medium text-ink underline underline-offset-2">
            + Create another certificate
          </Link>
          <span className="text-ink-muted">·</span>
          <Link href="/certificates" className="text-small text-ink-muted hover:underline">
            Back to Certificates List
          </Link>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-rule pb-4">
          <h1 className="font-record text-2xl font-semibold">Certificate Preview</h1>
          <p className="mt-1 max-w-measure text-small text-ink-muted">
            Inspect the candidate name, role, and generated phrasing on the official template before saving to the database.
          </p>
        </header>

        {duplicates.length > 0 ? (
          <div className="mt-6 rounded-md border border-caution/40 bg-caution-tint p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-caution">Possible Duplicate Certificate Detected</p>
                <p className="mt-1 text-small text-ink-soft">
                  A certificate already exists matching this candidate and internship details:
                </p>
                <div className="mt-3 space-y-2">
                  {duplicates.map((dup) => (
                    <div key={dup.id} className="rounded border border-caution/30 bg-white/80 p-3 text-small">
                      <p className="font-bold text-ink">{dup.candidateName}</p>
                      <p className="text-ink-muted">{dup.role} ({dup.startDate} – {dup.endDate})</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Link
                          href={`/certificates/${dup.id}`}
                          target="_blank"
                          className="rounded border border-rule bg-white px-2.5 py-1 text-micro font-medium text-ink hover:border-ink-muted"
                        >
                          View Existing ({dup.certificateNumber})
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-micro text-ink-muted">
                  Note: Sometimes a corrected certificate legitimately needs to be generated. You may click &quot;Generate New Anyway&quot; if this is intended.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {previewUrl ? (
          <div className="mt-6 overflow-hidden rounded-lg border border-rule bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-rule bg-paper px-4 py-2 text-micro font-medium text-ink-muted">
              <span>Watermarked Preview</span>
              <span>Nextute Official Template v1</span>
            </div>
            <iframe
              src={previewUrl}
              title="Certificate preview"
              className="h-[30rem] w-full border-none md:h-[38rem]"
            />
          </div>
        ) : null}

        {formError ? <p className="field-error mt-3" role="alert">{formError}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setStep("form")} disabled={pending}>
            Edit Details
          </Button>
          <Button onClick={handleGenerate} disabled={pending}>
            {pending
              ? "Generating Certificate..."
              : duplicates.length > 0
              ? "Generate New Anyway"
              : "Generate Certificate"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePreview} className="mx-auto max-w-2xl" noValidate>
      <h1 className="font-record text-2xl">Create certificate</h1>
      <p className="mt-1 max-w-measure text-small text-ink-muted">
        The certificate number, wording and dates are generated from these details. You will see the
        finished certificate before anything is saved.
      </p>

      <fieldset className="mt-8 border-t border-rule pt-5">
        <legend className="sr-only">Candidate</legend>
        <h2 className="text-small font-medium text-ink-soft">Candidate</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-[7rem_1fr]">
          <div>
            <label className="field-label" htmlFor="title">Title</label>
            <select
              id="title" className="field-input" value={values.title}
              onChange={(event) => update("title", event.target.value)}
            >
              <option value="">None</option>
              {TITLES.map((title) => <option key={title} value={title}>{title}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="candidateName">Full name</label>
            <input
              id="candidateName" className="field-input" required
              value={values.candidateName}
              onChange={(event) => update("candidateName", event.target.value)}
              placeholder="Harsh Raj Anand"
            />
            {fieldErrors.candidateName ? <p className="field-error">{fieldErrors.candidateName}</p> : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email" type="email" className="field-input" value={values.email}
              onChange={(event) => update("email", event.target.value)}
            />
            {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
          </div>
          <div>
            <label className="field-label" htmlFor="phone">Phone</label>
            <input
              id="phone" className="field-input" value={values.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
            {fieldErrors.phone ? <p className="field-error">{fieldErrors.phone}</p> : null}
          </div>
        </div>
        <p className="mt-2 text-micro text-ink-muted">
          Email is optional, but it is the only thing that reliably tells two candidates with the same
          name apart.
        </p>
      </fieldset>

      <fieldset className="mt-8 border-t border-rule pt-5">
        <legend className="sr-only">Internship</legend>
        <h2 className="text-small font-medium text-ink-soft">Internship</h2>

        <div className="mt-4">
          <label className="field-label" htmlFor="role">Role</label>
          <input
            id="role" className="field-input" required value={values.role}
            onChange={(event) => update("role", event.target.value)}
            placeholder="Data Analyst Intern"
          />
          {fieldErrors.role ? <p className="field-error">{fieldErrors.role}</p> : null}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="startDate">Start date</label>
            <input
              id="startDate" type="date" className="field-input" required value={values.startDate}
              onChange={(event) => update("startDate", event.target.value)}
            />
            {fieldErrors.startDate ? <p className="field-error">{fieldErrors.startDate}</p> : null}
          </div>
          <div>
            <label className="field-label" htmlFor="endDate">End date</label>
            <input
              id="endDate" type="date" className="field-input" required value={values.endDate}
              onChange={(event) => update("endDate", event.target.value)}
            />
            {fieldErrors.endDate ? <p className="field-error">{fieldErrors.endDate}</p> : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-8 border-t border-rule pt-5">
        <legend className="sr-only">Certificate</legend>
        <h2 className="text-small font-medium text-ink-soft">Certificate</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="issueDate">Issue date</label>
            <input
              id="issueDate" type="date" className="field-input" required value={values.issueDate}
              onChange={(event) => update("issueDate", event.target.value)}
            />
            {fieldErrors.issueDate ? <p className="field-error">{fieldErrors.issueDate}</p> : null}
          </div>
          <div>
            <label className="field-label" htmlFor="templateId">Template</label>
            <select
              id="templateId" className="field-input" value={values.templateId}
              onChange={(event) => update("templateId", event.target.value)}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} (v{template.version})
                </option>
              ))}
            </select>
            {fieldErrors.templateId ? <p className="field-error">{fieldErrors.templateId}</p> : null}
          </div>
          <div>
            <label className="field-label" htmlFor="signatory">Signatory</label>
            <select
              id="signatory" className="field-input" value={values.signatory}
              onChange={(event) => update("signatory", event.target.value)}
            >
              <option value="Director">Director</option>
              <option value="Head of HR">Head of HR</option>
              <option value="CEO & Founder">CEO &amp; Founder</option>
              <option value="Managing Director">Managing Director</option>
            </select>
          </div>
        </div>
      </fieldset>

      {formError ? <p className="field-error mt-5" role="alert">{formError}</p> : null}

      <div className="mt-8 flex gap-3">
        <Button type="submit" disabled={pending || templates.length === 0}>
          {pending ? "Building preview" : "Preview certificate"}
        </Button>
        <Link
          href="/certificates"
          className="inline-flex items-center px-2 text-small text-ink-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
