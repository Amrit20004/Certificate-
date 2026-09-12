import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getOrRenderCertificatePdf } from "@/server/certificates";
import { recordAudit } from "@/lib/audit";
import { errorResponse } from "@/lib/api";

/**
 * PDFs are streamed through this authenticated route rather than served from a
 * public bucket, so storage URLs are never guessable or shareable.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("certificate:download");
    const { id } = await ctx.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      return new Response("Certificate not found", { status: 404 });
    }

    const { pdf, filename } = await getOrRenderCertificatePdf(certificate.id);

    await recordAudit({
      userId: user.id,
      certificateId: certificate.id,
      action: "DOWNLOAD_CERTIFICATE",
      metadata: { certificateNumber: certificate.certificateNumber },
    });

    const disposition = request.nextUrl.searchParams.get("inline") ? "inline" : "attachment";

    return new Response(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
