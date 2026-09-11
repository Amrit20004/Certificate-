/**
 * Prints a measuring grid over the certificate design so you can read off the
 * coordinates for templates/internship-v1.json without guessing.
 *
 *   npm run template:probe
 *
 * Open templates/assets/grid-overlay.pdf, find where each value should sit, and
 * copy the numbers into the config. Labels use the same top-left origin the
 * config does, so what you read is what you type.
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const SOURCE = path.resolve("templates/assets/internship-template.pdf");
const OUTPUT = path.resolve("templates/assets/grid-overlay.pdf");
const MINOR = 25;
const MAJOR = 100;

async function main() {
  const bytes = await readFile(SOURCE).catch(() => {
    throw new Error(
      `Put your certificate design at ${SOURCE} first. It must be a single-page PDF ` +
        `with no candidate details on it.`,
    );
  });

  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPages()[0];
  const { width, height } = page.getSize();

  const faint = rgb(0.45, 0.6, 0.85);
  const strong = rgb(0.75, 0.15, 0.3);

  for (let x = 0; x <= width; x += MINOR) {
    const major = x % MAJOR === 0;
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: height },
      thickness: major ? 0.7 : 0.3,
      color: major ? strong : faint,
      opacity: major ? 0.55 : 0.3,
    });
    if (major) {
      page.drawText(String(x), { x: x + 2, y: height - 12, size: 7, font, color: strong });
    }
  }

  for (let y = 0; y <= height; y += MINOR) {
    const major = y % MAJOR === 0;
    page.drawLine({
      start: { x: 0, y: height - y },
      end: { x: width, y: height - y },
      thickness: major ? 0.7 : 0.3,
      color: major ? strong : faint,
      opacity: major ? 0.55 : 0.3,
    });
    if (major) {
      page.drawText(String(y), { x: 3, y: height - y + 2, size: 7, font, color: strong });
    }
  }

  await writeFile(OUTPUT, await doc.save());

  console.log(`Page size: ${Math.round(width)} x ${Math.round(height)} pt`);
  console.log(`Grid written to ${OUTPUT}`);
  console.log(`Numbers are measured from the top-left corner, matching "origin": "top-left".`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
