import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { certificateInputSchema } from "@/lib/validation";
import { findPossibleDuplicates } from "@/server/certificates";
import { parseISODate } from "@/lib/dates";
import { errorResponse } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    await requirePermission("certificate:create");
    const input = certificateInputSchema.parse(await request.json());

    const matches = await findPossibleDuplicates({
      candidateName: input.candidateName,
      email: input.email || null,
      role: input.role,
      startDate: parseISODate(input.startDate),
      endDate: parseISODate(input.endDate),
    });

    return NextResponse.json({ matches });
  } catch (error) {
    return errorResponse(error);
  }
}
