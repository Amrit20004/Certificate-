import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const ui = Inter({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const record = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-record",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nextute Certificates",
  description: "Issue and verify internship certificates for Nextute Edtech Pvt. Ltd.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${record.variable}`}>
      <body>{children}</body>
    </html>
  );
}
