import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "CREATE_CERTIFICATE"
  | "GENERATE_CERTIFICATE"
  | "UPDATE_CERTIFICATE"
  | "DOWNLOAD_CERTIFICATE"
  | "REVOKE_CERTIFICATE"
  | "RESTORE_CERTIFICATE"
  | "CREATE_USER"
  | "CREATE_TEMPLATE"
  | "ACTIVATE_TEMPLATE";

interface AuditInput {
  userId?: string | null;
  certificateId?: string | null;
  action: AuditAction;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Audit writes never block the operation they describe — a logging failure
 * should not lose a certificate that was successfully issued.
 */
export async function recordAudit(input: AuditInput, tx?: Prisma.TransactionClient) {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;

  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
    userAgent = h.get("user-agent") ?? undefined;
  } catch {
    // Called outside a request (seed script, background job).
  }

  const client = tx ?? prisma;
  try {
    await client.auditLog.create({
      data: {
        userId: input.userId ?? undefined,
        certificateId: input.certificateId ?? undefined,
        action: input.action,
        metadata: input.metadata,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", input.action, error);
  }
}
