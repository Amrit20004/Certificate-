import type { Config } from "tailwindcss";

/**
 * Palette notes: the subject is an official document registry, so the system
 * borrows from record-keeping rather than from dashboard fashion — navy ink on
 * cool paper, hairline rules instead of drop shadows, and exactly two signal
 * colours (a deep green for valid, a wax-seal maroon for revoked) that appear
 * nowhere else. Nothing here is decorative.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#101B2D", soft: "#243348", muted: "#5A6678" },
        paper: "#F6F7F9",
        rule: "#E1E5EC",
        seal: { DEFAULT: "#8E1F3C", tint: "#FBEEF1" },
        valid: { DEFAULT: "#0F6B45", tint: "#EAF4EF" },
        caution: { DEFAULT: "#8A5B00", tint: "#FBF3E2" },
      },
      fontFamily: {
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        record: ["var(--font-record)", "Georgia", "serif"],
      },
      fontSize: {
        // Type scale, 1.25 ratio from a 16px body.
        micro: ["0.75rem", { lineHeight: "1.1rem", letterSpacing: "0.01em" }],
        small: ["0.8125rem", { lineHeight: "1.25rem" }],
      },
      borderRadius: { sm: "3px", DEFAULT: "4px", lg: "6px" },
      maxWidth: { measure: "68ch" },
    },
  },
  plugins: [],
} satisfies Config;
