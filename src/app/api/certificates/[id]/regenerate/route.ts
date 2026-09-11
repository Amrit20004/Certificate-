import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { regenerateCertificate } from "@/server/certificates";
import { errorResponse } from "@/lib/api";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("certificate:regenerate");
    const { id } = await ctx.params;
    const warnings = await regenerateCertificate(id, user.id);
    return NextResponse.json({ ok: true, warnings });
  } catch (error) {
    return errorResponse(error);
  }
}
