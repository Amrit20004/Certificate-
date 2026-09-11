import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { revokeInputSchema } from "@/lib/validation";
import { revokeCertificate } from "@/server/certificates";
import { errorResponse } from "@/lib/api";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("certificate:revoke");
    const { id } = await ctx.params;
    const { reason } = revokeInputSchema.parse(await request.json());

    const certificate = await revokeCertificate(id, reason, user.id);
    return NextResponse.json({ status: certificate.status, revokedAt: certificate.revokedAt });
  } catch (error) {
    return errorResponse(error);
  }
}
