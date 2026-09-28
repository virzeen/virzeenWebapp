import { z } from "zod";
import { idSchema, slugSchema } from "./common";
import { imageRefSchema } from "./catalog";

const altSchema = z.string().trim().min(1, { error: "Describe the image for screen readers" }).max(200);

export const portfolioBlockSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("text"),
    heading: z.string().trim().max(120).optional().or(z.literal("")),
    text: z.string().trim().min(1).max(4000),
  }),
  z.strictObject({
    type: z.literal("image"),
    url: imageRefSchema,
    alt: altSchema,
    caption: z.string().trim().max(200).optional().or(z.literal("")),
    layout: z.enum(["full", "inset"]),
  }),
]);
export type PortfolioBlock = z.infer<typeof portfolioBlockSchema>;

export const PORTFOLIO_KINDS = ["CAMPAIGN", "LOOKBOOK", "COLLABORATION"] as const;

export const portfolioProjectSchema = z.strictObject({
  title: z.string().trim().min(1, { error: "Enter a title" }).max(120),
  slug: slugSchema,
  kind: z.enum(PORTFOLIO_KINDS),
  summary: z.string().trim().min(1, { error: "Enter a short summary" }).max(300),
  coverUrl: imageRefSchema,
  coverAlt: altSchema,
  body: z.array(portfolioBlockSchema).max(40),
  productIds: z.array(idSchema).max(24),
  isPublished: z.boolean(),
  sortOrder: z.int().min(0).max(1000),
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
