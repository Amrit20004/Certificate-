/**
 * Date helpers for certificate text.
 *
 * All certificate dates are stored as UTC midnight so that formatting never
 * shifts a day because of the server's timezone. Always format with UTC getters.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th", 21 -> "21st" */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** Parse "YYYY-MM-DD" (the value an <input type="date"> gives you) to UTC midnight. */
export function parseISODate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) throw new Error(`Expected a YYYY-MM-DD date, got "${value}"`);
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  // Reject 31 February and friends, which Date.UTC silently rolls forward.
  if (date.getUTCMonth() !== Number(mo) - 1 || date.getUTCDate() !== Number(d)) {
    throw new Error(`"${value}" is not a real calendar date`);
  }
  return date;
}

/** Date -> "YYYY-MM-DD", for form fields. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "1st July 2026" — the certificate voice. */
export function formatOrdinalDate(date: Date): string {
  return `${ordinal(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "1 July 2026" — the verification page voice, where ordinals read as fussy. */
export function formatPlainDate(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** "Jul 2026" — table columns. */
export function formatShortDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()].slice(0, 3)} ${date.getUTCFullYear()}`;
}

/**
 * The range that goes into the certificate sentence.
 *
 * Within one year the year is stated once at the end ("1st July to 31st August 2026"),
 * which is how the printed template reads. Across a year boundary both years are
 * stated, otherwise a December–January internship silently loses a year.
 */
export function formatCertificateRange(start: Date, end: Date): string {
  const left = start.getUTCFullYear() === end.getUTCFullYear()
    ? `${ordinal(start.getUTCDate())} ${MONTHS[start.getUTCMonth()]}`
    : formatOrdinalDate(start);
  return `${left} to ${formatOrdinalDate(end)}`;
}

/** "1 July 2026 – 31 August 2026", for the verification page. */
export function formatDurationRange(start: Date, end: Date): string {
  return `${formatPlainDate(start)} – ${formatPlainDate(end)}`;
}
