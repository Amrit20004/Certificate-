import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { certificateInputSchema, certificateSearchSchema } from "@/lib/validation";
import { createCertificate, searchCertificates } from "@/server/certificates";
import { errorResponse } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    await requirePermission("certificate:view");
    const params = certificateSearchSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    return NextResponse.json(await searchCertificates(params));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("certificate:create");
    const input = certificateInputSchema.parse(await request.json());
    const result = await createCertificate(input, user.id);

    return NextResponse.json({
      id: result.certificate.id,
      certificateNumber: result.certificate.certificateNumber,
      verificationUrl: result.verificationUrl,
      warnings: result.warnings,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
