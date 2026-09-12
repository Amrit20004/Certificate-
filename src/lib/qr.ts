import QRCode from "qrcode";

/**
 * The QR encodes only the verification URL — never candidate details. Anyone
 * can scan it, so the page it lands on decides what is public.
 */
export function verificationUrl(token: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

  const rawBase = envUrl || vercelUrl || "http://localhost:3000";
  const withProtocol = rawBase.startsWith("http://") || rawBase.startsWith("https://")
    ? rawBase
    : `https://${rawBase}`;

  const base = withProtocol.replace(/\/+$/, "");
  return `${base}/verify/${token}`;
}

/**
 * PNG bytes at high error correction, so the code still scans if the seal or a
 * fold clips a corner of the printed certificate.
 */
export async function generateQrPng(url: string, pixels = 600): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 1,
    width: pixels,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
  return new Uint8Array(buffer);
}
