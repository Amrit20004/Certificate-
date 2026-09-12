import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  hexToRgb,
  type ImageField,
  type ParagraphField,
  type TemplateConfig,
  type TextField,
} from "./template-config";

export interface RenderInput {
  /** The untouched design, loaded from storage. */
  templatePdf: Uint8Array;
  config: TemplateConfig;
  data: {
    candidateName: string;
    /** Paragraphs, already generated. Blank entries are skipped. */
    bodyParagraphs: string[];
    certificateNumber: string;
    issueDate: string;
    role: string;
    qrPng: Uint8Array;
  };
  /** Stamps a diagonal DRAFT watermark. Used by the preview endpoint. */
  watermark?: string;
}

export interface RenderResult {
  pdf: Uint8Array;
  /** Anything that had to be shrunk or truncated, so the UI can warn the admin. */
  warnings: string[];
}

/** Converts a top-left y into pdf-lib's bottom-left coordinate space. */
function toPdfY(config: TemplateConfig, page: PDFPage, y: number): number {
  return config.origin === "top-left" ? page.getHeight() - y : y;
}

function alignedX(x: number, width: number, maxWidth: number, align: string): number {
  if (align === "center") return x - width / 2;
  if (align === "right") return x + maxWidth - width;
  return x;
}

function widthOf(font: PDFFont, text: string, size: number, letterSpacing = 0): number {
  const base = font.widthOfTextAtSize(text, size);
  return letterSpacing ? base + letterSpacing * Math.max(0, text.length - 1) : base;
}

/**
 * Picks the largest size that fits, down to minSize. If the text still doesn't
 * fit at minSize it is truncated with an ellipsis — a name running through the
 * border is worse than a name that is visibly shortened, and the admin gets a
 * warning either way so they can fix the record.
 */
function fitText(
  font: PDFFont,
  text: string,
  field: { size: number; minSize?: number; maxWidth: number; letterSpacing?: number },
  warnings: string[],
  label: string,
): { text: string; size: number } {
  const floor = field.minSize ?? field.size;
  let size = field.size;

  while (size > floor && widthOf(font, text, size, field.letterSpacing) > field.maxWidth) {
    size -= 0.5;
  }

  if (widthOf(font, text, size, field.letterSpacing) <= field.maxWidth) {
    if (size < field.size) {
      warnings.push(`${label} was reduced to ${size}pt to fit the template.`);
    }
    return { text, size };
  }

  let truncated = text;
  while (truncated.length > 1 && widthOf(font, `${truncated}…`, size, field.letterSpacing) > field.maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  warnings.push(`${label} was too long for the template and has been shortened. Check the PDF before issuing.`);
  return { text: `${truncated}…`, size };
}

function drawTextField(
  page: PDFPage,
  field: TextField,
  value: string,
  font: PDFFont,
  config: TemplateConfig,
  warnings: string[],
  label: string,
) {
  const cased =
    field.transform === "upper" ? value.toUpperCase()
    : field.transform === "lower" ? value.toLowerCase()
    : value;

  const fitted = fitText(font, cased, field, warnings, label);
  const width = widthOf(font, fitted.text, fitted.size, field.letterSpacing);
  const color = hexToRgb(field.color);

  page.drawText(fitted.text, {
    x: alignedX(field.x, width, field.maxWidth, field.align),
    y: toPdfY(config, page, field.y),
    size: fitted.size,
    font,
    color: rgb(color.r, color.g, color.b),
    ...(field.letterSpacing ? { characterSpacing: field.letterSpacing } : {}),
  });
}

/** Greedy word wrap. Words longer than the line are hard-broken. */
function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);

    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
    } else {
      let chunk = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraphField(
  page: PDFPage,
  field: ParagraphField,
  paragraphs: string[],
  font: PDFFont,
  config: TemplateConfig,
  warnings: string[],
) {
  const floor = field.minSize ?? field.size;
  let size = field.size;
  let blocks: string[][] = [];

  // Shrink until the whole body fits inside maxLines.
  for (;;) {
    blocks = paragraphs.filter(Boolean).map((p) => wrap(font, p, size, field.maxWidth));
    const total = blocks.reduce((n, b) => n + b.length, 0);
    if (total <= field.maxLines || size <= floor) {
      if (total > field.maxLines) {
        warnings.push(
          `The certificate text needs ${total} lines but the template allows ${field.maxLines}. ` +
            `Shorten the internship role, or raise maxLines in the template config.`,
        );
      } else if (size < field.size) {
        warnings.push(`Certificate text was reduced to ${size}pt to fit.`);
      }
      break;
    }
    size -= 0.5;
  }

  const color = hexToRgb(field.color);
  const lineGap = size * field.lineHeight;
  let y = toPdfY(config, page, field.y);

  blocks.forEach((lines, index) => {
    if (index > 0) y -= size * field.paragraphGap;
    for (const line of lines) {
      const width = font.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: alignedX(field.x, width, field.maxWidth, field.align),
        y,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });
      y -= lineGap;
    }
  });
}

function drawImageField(
  page: PDFPage,
  field: ImageField,
  image: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  config: TemplateConfig,
) {
  // For images, y is the TOP edge when origin is top-left.
  const y = config.origin === "top-left"
    ? page.getHeight() - field.y - field.height
    : field.y;
  page.drawImage(image, { x: field.x, y, width: field.width, height: field.height });
}

async function resolveFonts(doc: PDFDocument, config: TemplateConfig): Promise<Record<string, PDFFont>> {
  const fonts: Record<string, PDFFont> = {};

  for (const [key, ref] of Object.entries(config.fonts)) {
    if (ref.file) {
      const candidates = [
        path.resolve(process.cwd(), ref.file),
        path.resolve(process.cwd(), "templates/assets/fonts", path.basename(ref.file)),
      ];

      let loaded = false;
      for (const p of candidates) {
        try {
          const bytes = await readFile(p);
          fonts[key] = await doc.embedFont(bytes, { subset: true });
          loaded = true;
          break;
        } catch {}
      }

      if (loaded) continue;

      console.warn(`[pdf] font "${key}" file missing at ${ref.file}, falling back to standard font`);
    }

    const fallbackName = (ref.standard ?? "Helvetica") as keyof typeof StandardFonts;
    fonts[key] = await doc.embedFont(StandardFonts[fallbackName] ?? StandardFonts.Helvetica);
  }
  return fonts;
}

/**
 * Static template + dynamic data + QR = final certificate.
 * The background page is copied verbatim; we only draw on top of it.
 */
export async function renderCertificate(input: RenderInput): Promise<RenderResult> {
  const { config, data } = input;
  const warnings: string[] = [];

  const doc = await PDFDocument.load(input.templatePdf);
  doc.registerFontkit(fontkit);

  const fonts = await resolveFonts(doc, config);
  const pages = doc.getPages();

  const pageFor = (index: number): PDFPage => {
    const page = pages[index];
    if (!page) throw new Error(`Template has no page ${index}. It has ${pages.length}.`);
    return page;
  };

  const fontFor = (name: string): PDFFont => {
    const font = fonts[name];
    if (!font) throw new Error(`Template config references font "${name}", which is not defined in its fonts map.`);
    return font;
  };

  const f = config.fields;

  drawTextField(pageFor(f.candidateName.page), f.candidateName, data.candidateName,
    fontFor(f.candidateName.font), config, warnings, "Candidate name");

  drawParagraphField(pageFor(f.body.page), f.body, data.bodyParagraphs,
    fontFor(f.body.font), config, warnings);

  if (f.role) {
    drawTextField(pageFor(f.role.page), f.role, data.role, fontFor(f.role.font), config, warnings, "Internship role");
  }
  if (f.certificateNumber) {
    drawTextField(pageFor(f.certificateNumber.page), f.certificateNumber, data.certificateNumber,
      fontFor(f.certificateNumber.font), config, warnings, "Certificate ID");
  }
  if (f.issueDate) {
    drawTextField(pageFor(f.issueDate.page), f.issueDate, data.issueDate,
      fontFor(f.issueDate.font), config, warnings, "Issue date");
  }

  const qr = await doc.embedPng(data.qrPng);
  drawImageField(pageFor(f.qr.page), f.qr, qr, config);

  if (input.watermark) {
    const page = pageFor(0);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const size = 64;
    const width = font.widthOfTextAtSize(input.watermark, size);
    page.drawText(input.watermark, {
      x: page.getWidth() / 2 - width / 2,
      y: page.getHeight() / 2 - size / 2,
      size,
      font,
      color: rgb(0.55, 0.58, 0.63),
      opacity: 0.22,
      rotate: { type: "degrees", angle: 18 } as never,
    });
  }

  doc.setTitle(`Internship Certificate ${data.certificateNumber}`);
  doc.setProducer("Nextute Certificate Management System");
  doc.setCreator("Nextute Edtech Pvt. Ltd.");

  return { pdf: await doc.save(), warnings };
}
