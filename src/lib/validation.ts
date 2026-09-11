import { z } from "zod";
import { parseISODate } from "./dates";
import { TITLES } from "./certificate-text";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD form")
  .refine((v) => {
    try { parseISODate(v); return true; } catch { return false; }
  }, "That date does not exist");

export const certificateInputSchema = z
  .object({
    candidateName: z
      .string()
      .trim()
      .min(2, "Enter the candidate's full name")
      .max(120, "Names longer than 120 characters will not fit the certificate"),
    title: z.enum(TITLES).optional().or(z.literal("")),
    email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
    phone: z
      .string()
      .trim()
      .regex(/^[\d+\-\s()]{7,20}$/, "Enter a valid phone number")
      .optional()
      .or(z.literal("")),
    role: z
      .string()
      .trim()
      .min(2, "Enter the internship role")
      .max(80, "Roles longer than 80 characters will not fit the certificate"),
    startDate: isoDate,
    endDate: isoDate,
    issueDate: isoDate,
    templateId: z.string().min(1, "Choose a template"),
    /** Set after the admin acknowledges a duplicate warning. */
    confirmDuplicate: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const start = parseISODate(value.startDate);
    const end = parseISODate(value.endDate);
    const issue = parseISODate(value.issueDate);

    if (end < start) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "The end date is before the start date" });
    }
    if (issue < end) {
      ctx.addIssue({
        code: "custom",
        path: ["issueDate"],
        message: "A certificate cannot be issued before the internship ends",
      });
    }
    const tenYears = 1000 * 60 * 60 * 24 * 365 * 10;
    if (end.getTime() - start.getTime() > tenYears) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "That internship period looks wrong" });
    }
  });

export type CertificateInput = z.infer<typeof certificateInputSchema>;

export const revokeInputSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, "Give a reason — it is stored permanently in the audit log")
    .max(500),
});

export const certificateSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["DRAFT", "ISSUED", "REVOKED"]).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  templateId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});
