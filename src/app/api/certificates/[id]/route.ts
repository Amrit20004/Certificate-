import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { deleteCertificate } from "@/server/certificates";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("certificate:delete");
    const { id } = await params;
    await deleteCertificate(id);
    return NextResponse.json({ ok: true, message: "Certificate deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to delete certificate" },
      { status: error?.status ?? 400 }
    );
  }
}
