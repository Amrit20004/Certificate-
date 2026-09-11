import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { certificateInputSchema } from "@/lib/validation";
import { renderPreview } from "@/server/certificates";
import { errorResponse } from "@/lib/api";

/** Renders the real template with the entered values, watermarked, no DB write. */
export async function POST(request: NextRequest) {
  try {
    await requirePermission("certificate:create");
    const input = certificateInputSchema.parse(await request.json());
    const pdf = await renderPreview(input);

    return new Response(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="preview.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
