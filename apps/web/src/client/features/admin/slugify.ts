/** A URL slug from a name: "Linen Shirt (Black)" → "linen-shirt-black" (slugSchema's format). */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120)
    .replace(/-$/, "");
