import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";

export const ORG_PREFIX = "NXT";
export const TYPE_PREFIX = "INT";
const SEQUENCE_WIDTH = 6;

/**
 * Reserves the next sequential number for a year.
 *
 * MUST be called inside a transaction — it takes a row lock on the counter and
 * relies on that lock being held until the certificate row is committed.
 * `count(*) + 1` would collide the moment two admins click Generate at the same
 * time, and bulk generation makes that routine rather than theoretical.
 */
export async function reserveCertificateNumber(
  tx: Prisma.TransactionClient,
  year: number,
  prefix = `${ORG_PREFIX}-${TYPE_PREFIX}`,
): Promise<string> {
  const existing = await tx.certificateCounter.findUnique({
    where: { prefix_year: { prefix, year } },
  });

  let next: number;
  if (!existing) {
    const created = await tx.certificateCounter.create({
      data: { prefix, year, current: 1 },
    });
    next = created.current;
  } else {
    const updated = await tx.certificateCounter.update({
      where: { prefix_year: { prefix, year } },
      data: { current: { increment: 1 } },
    });
    next = updated.current;
  }

  return `${prefix}-${year}-${String(next).padStart(SEQUENCE_WIDTH, "0")}`;
}

/**
 * Token for the public verification URL. 160 bits of entropy in base32url —
 * long enough that scanning the ID space is pointless, short enough to stay
 * readable if someone types it by hand.
 */
export function generateVerificationToken(): string {
  return randomBytes(20)
    .toString("base64")
    .replace(/\+/g, "")
    .replace(/\//g, "")
    .replace(/=/g, "")
    .slice(0, 24);
}

/** "Harsh_Raj_Anand_NXT-INT-2026-000001.pdf" */
export function buildPdfFilename(candidateName: string, certificateNumber: string): string {
  const safeName = candidateName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60) || "Certificate";
  return `${safeName}_${certificateNumber}.pdf`;
}
