import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { deleteCandidate } from "@/server/candidates";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("candidate:delete");
    const { id } = await params;
    await deleteCandidate(id);
    return NextResponse.json({ ok: true, message: "Candidate deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to delete candidate" },
      { status: error?.status ?? 400 }
    );
  }
}
