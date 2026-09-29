import { z } from "zod";
import { idSchema, slugSchema } from "./common";
import { imageRefSchema, sortOrderSchema } from "./catalog";

const altSchema = z
  .string()
  .trim()
  .min(1, { error: "Describe the image for screen readers" })
  .max(200, { error: "Keep the alt text under 200 characters" });

export const portfolioBlockSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("text"),
    heading: z
      .string()
      .trim()
      .max(120, { error: "Keep the heading under 120 characters" })
      .optional()
      .or(z.literal("")),
    text: z
      .string()
      .trim()
      .min(1, { error: "Write the text for this block" })
      .max(4000, { error: "Keep this block under 4,000 characters" }),
  }),
  z.strictObject({
    type: z.literal("image"),
    url: imageRefSchema,
    alt: altSchema,
    caption: z
      .string()
      .trim()
      .max(200, { error: "Keep the caption under 200 characters" })
      .optional()
      .or(z.literal("")),
    layout: z.enum(["full", "inset"]),
  }),
]);
export type PortfolioBlock = z.infer<typeof portfolioBlockSchema>;

export const PORTFOLIO_KINDS = ["CAMPAIGN", "LOOKBOOK", "COLLABORATION"] as const;
export type PortfolioKind = (typeof PORTFOLIO_KINDS)[number];

/** How each kind is named to people, in the admin form and lists. */
export const PORTFOLIO_KIND_LABELS: Record<PortfolioKind, string> = {
  CAMPAIGN: "Campaign",
  LOOKBOOK: "Lookbook",
  COLLABORATION: "Collaboration",
};

export const portfolioProjectSchema = z.strictObject({
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter a title" })
    .max(120, { error: "Keep the title under 120 characters" }),
  slug: slugSchema,
  kind: z.enum(PORTFOLIO_KINDS),
  summary: z
    .string()
    .trim()
    .min(1, { error: "Enter a short summary" })
    .max(300, { error: "Keep the summary under 300 characters" }),
  coverUrl: imageRefSchema,
  coverAlt: altSchema,
  body: z.array(portfolioBlockSchema).max(40, { error: "Add up to 40 blocks" }),
  productIds: z.array(idSchema).max(24, { error: "Choose up to 24 products" }),
  isPublished: z.boolean(),
  sortOrder: sortOrderSchema,
});
export type PortfolioProjectInput = z.input<typeof portfolioProjectSchema>;

export const savePortfolioProjectSchema = z.strictObject({
  id: idSchema.optional(),
  project: portfolioProjectSchema,
});
export type SavePortfolioProjectInput = z.input<typeof savePortfolioProjectSchema>;

/** Parses stored project body JSON; invalid blocks are dropped rather than crashing the page. */
export function parsePortfolioBody(value: unknown): PortfolioBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((block) => {
    const result = portfolioBlockSchema.safeParse(block);
    return result.success ? [result.data] : [];
  });
}
