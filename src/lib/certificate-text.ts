import { formatCertificateRange } from "./dates";

export const TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", "Mx."] as const;
export type Title = (typeof TITLES)[number];

/**
 * Possessive pronoun for the closing sentence. Anything we can't map
 * confidently — including a blank title — falls back to "their", which is
 * always correct and never mis-genders a candidate.
 */
export function possessivePronoun(title?: string | null): "his" | "her" | "their" {
  switch ((title ?? "").trim().replace(/\.$/, "").toLowerCase()) {
    case "mr": return "his";
    case "ms":
    case "mrs":
    case "miss": return "her";
    default: return "their";
  }
}

/**
 * "a" or "an" for the role that follows. Goes by sound, not just spelling, so
 * "a UX Intern" and "an HR Intern" both come out right. The existing printed
 * certificate reads "as an Data Analyst Intern", which is the kind of thing
 * nobody notices until it is on 400 certificates.
 */
export function indefiniteArticle(role: string): "a" | "an" {
  const word = role.trim().split(/\s+/)[0]?.replace(/[^A-Za-z]/g, "") ?? "";
  if (!word) return "a";

  // An all-caps opener is read letter by letter: HR, ML, SEO, UX.
  if (word.length <= 4 && word === word.toUpperCase()) {
    return /^[AEFHILMNORSX]/.test(word) ? "an" : "a";
  }
  // Written-out words that start with a vowel letter but a consonant sound.
  if (/^(uni|use|user|eu|one)/i.test(word)) return "a";

  return /^[aeiou]/i.test(word) ? "an" : "a";
}

export interface CertificateTextInput {
  name: string;
  title?: string | null;
  role: string;
  startDate: Date;
  endDate: Date;
}

export interface CertificateText {
  /** "Harsh Raj Anand" — the large display name on the certificate. */
  displayName: string;
  /** The body paragraph, as one string with a blank line between sentences. */
  body: string;
  /** The two paragraphs separately, for layouts that position them apart. */
  paragraphs: [string, string];
}

/**
 * Builds the certificate wording. Admins never type this — it is derived
 * entirely from the form so that every certificate reads identically.
 */
export function buildCertificateText(input: CertificateTextInput): CertificateText {
  const name = input.name.trim().replace(/\s+/g, " ");
  const role = input.role.trim().replace(/\s+/g, " ");
  const title = input.title?.trim();
  const salutation = title ? `${title} ${name}` : name;
  const range = formatCertificateRange(input.startDate, input.endDate);
  const pronoun = possessivePronoun(title);

  const first =
    `We are happy to certify that ${salutation} has completed Internship ` +
    `as ${indefiniteArticle(role)} "${role}" from ${range}.`;
  const second = `We appreciate ${pronoun} work and contributions.`;

  return { displayName: name, body: `${first}\n\n${second}`, paragraphs: [first, second] };
}
