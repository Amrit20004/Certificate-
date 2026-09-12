/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit", "qrcode", "bcryptjs"],
  outputFileTracingIncludes: {
    "/**": ["./templates/**/*"],
  },
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
};
export default nextConfig;
