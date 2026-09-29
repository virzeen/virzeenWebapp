import "server-only";
import type { Prisma } from "@virzeen/db";
import type { ProductData } from "@virzeen/validators";

// Style numbers and "Colour shown" (specs/product-editor-on-page.md "Styles, colour shown, origin"). A product's
// styles are its variant colours; a product without colours has one style named "". Each style has a number like
// VZ0042-101 (the product number, then 101, 102… in the order the styles were added) that never changes and is never
// reused: ProductStyle rows are never deleted.

type Tx = Prisma.TransactionClient;
type StyleEntry = ProductData["styles"][number];

/** The first style number of a product; later styles count up from it. */
const FIRST_SUFFIX = 101;

/**
 * A product's style names in style order: its distinct variant colours in row order (switched-off ones too, so they
 * keep their numbers), with the style "" first when the shop shows the product without styles: no colours at all, or
 * nothing for sale has one (catalogReads.getProductBySlug), e.g. after the last colour for sale was removed.
 */
export function styleColors(variants: readonly { color?: string | null; isActive?: boolean }[]): string[] {
  const colorOf = (variant: { color?: string | null }) => variant.color?.trim() ?? "";
  const colors = [...new Set(variants.map(colorOf).filter(Boolean))];
  const forSale = variants.filter((variant) => variant.isActive !== false);
  const plain = colors.length === 0 || (forSale.length > 0 && !forSale.some(colorOf));
  return plain ? ["", ...colors] : colors;
}

/** "VZ" + the product number (at least 4 digits) + "-" + the style's suffix: VZ0042-101. */
export function styleCode(productNumber: number, suffix: number): string {
  return `VZ${String(productNumber).padStart(4, "0")}-${suffix}`;
}

/** The number after the dash (101 in VZ0042-101); 0 when the code has none. */
function suffixOf(code: string): number {
  const suffix = Number.parseInt(code.slice(code.lastIndexOf("-") + 1), 10);
  return Number.isFinite(suffix) ? suffix : 0;
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Gives every style of a product its row (the style number and colour shown), after the variants are saved.
 * For each style name, the editor's entry with that name (any case) is used when there is one. Its row is found by
 * the entry's code first (a rename: the row takes the new name and keeps its number; codes of other products don't
 * match), then by name (any case). The style of a product without styles becomes the product's first style when it
 * gets styles (so that style keeps -101). Anything else gets the next number: one more than the highest this product
 * ever had.
 * `colourShown` comes from the entry (blank = none); a style whose entry leaves it out (or has no entry) keeps it.
 * Rows are never deleted; a row that no style uses any more keeps its name, unless a renamed style takes that name.
 */
export async function saveStyles(
  tx: Tx,
  product: { id: string; number: number },
  colors: readonly string[],
  entries: readonly StyleEntry[],
) {
  const rows = await tx.productStyle.findMany({
    where: { productId: product.id },
    select: { id: true, color: true, code: true, colourShown: true },
    orderBy: { createdAt: "asc" },
  });
  const claimed = new Set<string>();
  const claim = (row: (typeof rows)[number] | undefined) => {
    if (row) claimed.add(row.id);
    return row;
  };

  const plan = colors.map((color) => {
    // The entry with exactly this name first: two colours may differ only in case in older data.
    const entry =
      entries.find((candidate) => candidate.color.trim() === color) ??
      entries.find((candidate) => sameName(candidate.color.trim(), color));
    const code = entry?.code?.trim().toUpperCase();
    const byCode = code ? rows.find((row) => row.code === code && !claimed.has(row.id)) : undefined;
    return {
      color,
      row: claim(byCode),
      // undefined = leave the stored colour shown alone.
      colourShown: entry?.colourShown === undefined ? undefined : entry.colourShown.trim() || null,
    };
  });
  // Then by name: the same spelling first, then the same name in another case (a removed "White" added back as
  // "white" keeps its number).
  for (const style of plan) {
    style.row ??= claim(rows.find((row) => row.color === style.color && !claimed.has(row.id)));
  }
  for (const style of plan) {
    style.row ??= claim(rows.find((row) => sameName(row.color, style.color) && !claimed.has(row.id)));
  }
  const unnamed = rows.find((row) => row.color === "" && !claimed.has(row.id));
  const firstNew = plan.find((style) => !style.row);
  if (unnamed && firstNew && firstNew.color !== "") firstNew.row = claim(unnamed);

  // Rows that change name: the renamed styles, and unused rows holding a name a renamed style takes. They first move
  // to a placeholder name, so two styles can swap names without either hitting the (productId, color) constraint.
  const taken = new Set(plan.map((style) => style.color));
  const renames = [
    ...plan.flatMap((style) =>
      style.row && style.row.color !== style.color ? [{ row: style.row, color: style.color }] : [],
    ),
    ...rows.flatMap((row) =>
      !claimed.has(row.id) && taken.has(row.color) ? [{ row, color: `${row.color} (${row.code})` }] : [],
    ),
  ];
  for (const { row } of renames) {
    await tx.productStyle.update({ where: { id: row.id }, data: { color: `${row.id}~` } });
  }
  for (const { row, color } of renames) {
    await tx.productStyle.update({ where: { id: row.id }, data: { color } });
  }

  let next = Math.max(FIRST_SUFFIX - 1, ...rows.map((row) => suffixOf(row.code))) + 1;
  for (const style of plan) {
    if (!style.row) {
      await tx.productStyle.create({
        data: {
          productId: product.id,
          color: style.color,
          code: styleCode(product.number, next++),
          colourShown: style.colourShown ?? null,
        },
      });
    } else if (style.colourShown !== undefined && style.colourShown !== style.row.colourShown) {
      await tx.productStyle.update({
        where: { id: style.row.id },
        data: { colourShown: style.colourShown },
      });
    }
  }
}

/**
 * A product's styles in style order with their numbers, for the shop (catalogReads.getProductBySlug): colour shown
 * falls back to the style's name (none for a product without styles). A style without a row is left out. Rows hold
 * trimmed names (saveStyles, the migration), so a colour is looked up trimmed and handed back as the page has it.
 */
export function stylesForShop(
  colors: readonly string[],
  rows: readonly { color: string; code: string; colourShown: string | null }[],
) {
  return (colors.length > 0 ? colors : [""]).flatMap((color) => {
    const row = rows.find((candidate) => candidate.color === color.trim());
    return row ? [{ color, code: row.code, colourShown: row.colourShown ?? (row.color || null) }] : [];
  });
}
