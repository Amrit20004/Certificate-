import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./rbac";
import { CertificateError } from "@/server/certificates";

/** One place that decides what an error looks like to the client. */
export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Some details need fixing.",
        fields: Object.fromEntries(
          error.issues.map((i) => [i.path.join(".") || "form", i.message]),
        ),
      },
      { status: 422 },
    );
  }
  if (error instanceof CertificateError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
  }

  // Never leak a stack trace or a database message to the browser.
  console.error("[api] unhandled", error);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
