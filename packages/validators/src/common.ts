import { z } from "zod";

/** Database ids are cuid2 strings (docs/database/data-rules.md §1). */
export const idSchema = z.cuid2({ error: "Invalid id" });

export const slugSchema = z
  .string()
  .min(1, { error: "Enter a URL slug" })
  .max(120, { error: "Keep the URL slug under 120 characters" })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use lowercase letters, numbers and hyphens" });

/** Paisa amounts are non-negative integers (docs/database/data-rules.md §1). Max Rs 1 crore fits Postgres int4. */
export const paisaSchema = z.int().min(0).max(1_000_000_000);

/** Admin list page number from the URL (`?page=`): anything odd or out of range falls back to page 1. */
export const adminPageSchema = z.coerce.number().int().min(1).max(10_000).catch(1);

export const paginationSchema = z.strictObject({
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

/** Order numbers look like VZ-260928-0042 (docs/glossary.md). */
export const orderNumberSchema = z.string().regex(/^VZ-\d{6}-\d{4}$/, { error: "Invalid order number" });

export const requiredText = (field: string, max = 200) =>
  z
    .string({ error: `Enter your ${field}` })
    .trim()
    .min(1, { error: `Enter your ${field}` })
    .max(max, { error: `Keep your ${field} under ${max} characters` });
