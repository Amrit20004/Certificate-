import { z } from "zod";

/**
 * A template is: one fixed background PDF (the design you already have) plus a
 * coordinate map describing where each dynamic value goes. Nothing about the
 * artwork is rebuilt in code — see templates/README.md.
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use #RRGGBB");

const fontRef = z.object({
  /** Path to a .ttf/.otf, relative to the project root. Required for script fonts. */
  file: z.string().optional(),
  /** One of pdf-lib's 14 built-ins, used when `file` is absent. */
  standard: z
    .enum([
      "Helvetica", "HelveticaBold", "HelveticaOblique",
      "TimesRoman", "TimesRomanBold", "TimesRomanItalic",
      "Courier", "CourierBold",
    ])
    .optional(),
});

const baseField = z.object({
  x: z.number(),
  y: z.number(),
  page: z.number().int().min(0).default(0),
});

const textField = baseField.extend({
  type: z.literal("text"),
  font: z.string(),
  size: z.number().positive(),
  /** Auto-shrink floor. Below this we truncate instead of shrinking further. */
  minSize: z.number().positive().optional(),
  maxWidth: z.number().positive(),
  align: z.enum(["left", "center", "right"]).default("left"),
  color: hexColor.default("#000000"),
  letterSpacing: z.number().default(0),
  /** Force upper/lower case, e.g. for an ID printed in caps. */
  transform: z.enum(["none", "upper", "lower"]).default("none"),
});

const paragraphField = baseField.extend({
  type: z.literal("paragraph"),
  font: z.string(),
  size: z.number().positive(),
  minSize: z.number().positive().optional(),
  maxWidth: z.number().positive(),
  maxLines: z.number().int().positive().default(6),
  lineHeight: z.number().positive().default(1.45),
  /** Extra gap between paragraphs, as a multiple of the font size. */
  paragraphGap: z.number().default(0.6),
  align: z.enum(["left", "center", "right"]).default("center"),
  color: hexColor.default("#000000"),
});

const imageField = baseField.extend({
  type: z.literal("image"),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const fieldSchema = z.discriminatedUnion("type", [textField, paragraphField, imageField]);

export const templateConfigSchema = z.object({
  version: z.number().int().positive(),
  label: z.string(),
  /**
   * "top-left" matches what you measure in a PDF viewer or image editor and is
   * converted internally. "bottom-left" is PDF-native.
   */
  origin: z.enum(["top-left", "bottom-left"]).default("top-left"),
  fonts: z.record(fontRef),
  fields: z.object({
    candidateName: textField,
    body: paragraphField,
    certificateNumber: textField.optional(),
    issueDate: textField.optional(),
    role: textField.optional(),
    qr: imageField,
  }),
});

export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type TextField = z.infer<typeof textField>;
export type ParagraphField = z.infer<typeof paragraphField>;
export type ImageField = z.infer<typeof imageField>;

export function parseTemplateConfig(input: unknown): TemplateConfig {
  return templateConfigSchema.parse(input);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}
