import { db } from "@virzeen/db";
import type { ProductData } from "@virzeen/validators";
import { beforeEach, describe, expect, it } from "vitest";
import { createCategory, createUser, resetDatabase } from "../../test/factories";
import { adminReads } from "../admin/admin-reads";
import { catalogReads } from "./catalog.reads";
import { catalogService } from "./catalog.service";

// Style numbers, colour shown, drafts and "You may also like" (specs/product-editor-on-page.md).

type Variant = ProductData["variants"][number];

const row = (color: string, size = "M", extra: Partial<Variant> = {}): Variant => ({
  sku: "",
  size,
  color,
  pricePaisa: 180_000,
  stock: 3,
  isActive: true,
  ...extra,
});

async function productInput(overrides: Partial<ProductData> = {}): Promise<ProductData> {
  const category = await createCategory();
  return {
    name: "Oversized Tee",
    slug: "oversized-tee",
    description: "Heavyweight cotton.",
    care: "",
    benefits: [],
    details: [],
    countryOfOrigin: "China",
    seoDescription: "",
    categoryId: category.id,
    sizeGuideId: "",
    collectionIds: [],
    isPublished: true,
    images: [{ url: "virzeen/products/tee/front", alt: "" }],
    features: [],
    featureLayout: "THREE",
    featureRows: [],
    styles: [],
    shippingPaisa: 0,
    variants: [row("Black")],
    ...overrides,
  };
}

/** Code of each style, by name, from the product's stored rows. */
async function codesOf(productId: string) {
  const rows = await db.productStyle.findMany({ where: { productId }, orderBy: { code: "asc" } });
  return Object.fromEntries(rows.map((style) => [style.color, style.code]));
}

/** "VZ0042" for the product: style numbers start with it. */
async function prefixOf(productId: string) {
  const { number } = await db.product.findUniqueOrThrow({
    where: { id: productId },
    select: { number: true },
  });
  return `VZ${String(number).padStart(4, "0")}`;
}

describe("style numbers (saveProduct)", () => {
  beforeEach(resetDatabase);

  it("numbers products in order and gives a new product's style -101, the next style -102", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const first = await catalogService.saveProduct(admin.id, { product: await productInput() });
    const second = await catalogService.saveProduct(admin.id, {
      product: await productInput({ slug: "second-tee" }),
    });
    const numbers = await db.product.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true },
    });
    expect(numbers.map((product) => product.id)).toEqual([first.id, second.id]);
    expect(numbers[1]!.number).toBe(numbers[0]!.number + 1);
    const prefix = await prefixOf(first.id);
    expect(prefix).toMatch(/^VZ\d{4,}$/);
    expect(first.values.styles).toEqual([{ color: "Black", colourShown: "", code: `${prefix}-101` }]);

    const saved = await catalogService.saveProduct(admin.id, {
      id: first.id,
      product: {
        ...(await productInput()),
        styles: first.values.styles,
        variants: [...first.values.variants, row("White")],
      },
    });

    expect(saved.values.styles.map((style) => style.code)).toEqual([`${prefix}-101`, `${prefix}-102`]);
    expect(await codesOf(first.id)).toEqual({ Black: `${prefix}-101`, White: `${prefix}-102` });
  });

  it("keeps a style's number when it's renamed, also when two styles swap names", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ variants: [row("Black"), row("White")] });
    const created = await catalogService.saveProduct(admin.id, { product: input });
    const prefix = await prefixOf(created.id);
    const [black, white] = created.values.variants;

    // Rename Black → Noir: its variants and its style entry change name, the entry keeps the code.
    const renamed = await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: {
        ...input,
        variants: [
          { ...black!, color: "Noir" },
          { ...white!, color: "White" },
        ],
        styles: [
          { color: "Noir", code: `${prefix}-101` },
          { color: "White", code: `${prefix}-102` },
        ],
      },
    });
    expect(renamed.values.styles.map(({ color, code }) => [color, code])).toEqual([
      ["Noir", `${prefix}-101`],
      ["White", `${prefix}-102`],
    ]);

    // Swap the names: each number follows its style.
    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: {
        ...input,
        variants: [
          { ...black!, color: "White" },
          { ...white!, color: "Noir" },
        ],
        styles: [
          { color: "White", code: `${prefix}-101` },
          { color: "Noir", code: `${prefix}-102` },
        ],
      },
    });
    expect(await codesOf(created.id)).toEqual({ White: `${prefix}-101`, Noir: `${prefix}-102` });
    expect(await db.productStyle.count()).toBe(2);
  });

  it("never reuses a number: a removed style keeps its row, the next style gets -103", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ variants: [row("Black"), row("White")] });
    const created = await catalogService.saveProduct(admin.id, { product: input });
    const prefix = await prefixOf(created.id);
    const [black] = created.values.variants;

    // White is removed (its variant leaves the form, so it's switched off), then Blue is added.
    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: { ...input, variants: [black!], styles: [{ color: "Black", code: `${prefix}-101` }] },
    });
    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: {
        ...input,
        variants: [black!, row("Blue")],
        styles: [{ color: "Black", code: `${prefix}-101` }],
      },
    });

    expect(await codesOf(created.id)).toEqual({
      Black: `${prefix}-101`,
      White: `${prefix}-102`,
      Blue: `${prefix}-103`,
    });
  });

  it("ignores a style number of another product, and moves a removed style's name aside when a rename takes it", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const other = await catalogService.saveProduct(admin.id, {
      product: await productInput({ slug: "other-tee", variants: [row("Red")] }),
    });
    const input = await productInput({ variants: [row("Black"), row("White")] });
    const created = await catalogService.saveProduct(admin.id, { product: input });
    const prefix = await prefixOf(created.id);
    const [black] = created.values.variants;

    // White is removed; then Black is renamed White. Red's code belongs to the other product: not used.
    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: { ...input, variants: [black!], styles: [] },
    });
    const saved = await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: {
        ...input,
        variants: [{ ...black!, color: "White" }, row("Green")],
        styles: [
          { color: "White", code: `${prefix}-101` },
          { color: "Green", code: other.values.styles[0]!.code },
        ],
      },
    });

    expect(saved.values.styles.map(({ color, code }) => [color, code])).toEqual([
      ["White", `${prefix}-101`],
      ["Green", `${prefix}-103`],
    ]);
    expect(await codesOf(created.id)).toEqual({
      White: `${prefix}-101`,
      [`White (${prefix}-102)`]: `${prefix}-102`,
      Green: `${prefix}-103`,
    });
    expect(await codesOf(other.id)).toEqual({ Red: other.values.styles[0]!.code });
  });

  it("gives a product without colours one style number, which its first style keeps", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ variants: [row("", "")] });
    const created = await catalogService.saveProduct(admin.id, { product: input });
    const prefix = await prefixOf(created.id);
    expect(created.values.styles).toEqual([{ color: "", colourShown: "", code: `${prefix}-101` }]);
    expect((await catalogReads.getProductBySlug("oversized-tee"))?.styles).toEqual([
      { color: "", code: `${prefix}-101`, colourShown: null },
    ]);

    const [only] = created.values.variants;
    const named = await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: { ...input, variants: [{ ...only!, color: "Black" }, row("White", "")], styles: [] },
    });

    expect(named.values.styles.map(({ color, code }) => [color, code])).toEqual([
      ["Black", `${prefix}-101`],
      ["White", `${prefix}-102`],
    ]);
  });

  it("gives the style number back when a removed style is added again, in any case", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ variants: [row("Black"), row("White")] });
    const created = await catalogService.saveProduct(admin.id, { product: input });
    const prefix = await prefixOf(created.id);
    const [black] = created.values.variants;

    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: { ...input, variants: [black!], styles: [] },
    });
    const again = await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: { ...input, variants: [black!, row("white")], styles: [] },
    });

    expect(again.values.styles.map(({ color, code }) => [color, code])).toEqual([
      ["Black", `${prefix}-101`],
      ["white", `${prefix}-102`],
    ]);
    expect(await db.productStyle.count()).toBe(2);
  });

  it("gives the product its no-style number when nothing for sale has a colour any more", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ variants: [row("Black"), row("Red")] });
    const created = await catalogService.saveProduct(admin.id, { product: input });
    const prefix = await prefixOf(created.id);
    const [black, red] = created.values.variants;

    // Red was removed earlier (switched off, keeps its colour); then Black, the last colour, is cleared from its row.
    const plain = await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: {
        ...input,
        variants: [
          { ...black!, color: "" },
          { ...red!, isActive: false },
        ],
        styles: created.values.styles,
      },
    });

    expect(plain.values.styles.map(({ color, code }) => [color, code])).toEqual([
      ["", `${prefix}-103`],
      ["Red", `${prefix}-102`],
    ]);
    expect((await catalogReads.getProductBySlug("oversized-tee"))?.styles).toEqual([
      { color: "", code: `${prefix}-103`, colourShown: null },
    ]);
  });

  it("saves the colour shown from the editor, clears a blank one, and keeps it when the entry leaves it out", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ variants: [row("Black"), row("White")] });
    const created = await catalogService.saveProduct(admin.id, {
      product: { ...input, styles: [{ color: "black", colourShown: " Black/White " }, { color: "White" }] },
    });
    expect(created.values.styles.map(({ color, colourShown }) => [color, colourShown])).toEqual([
      ["Black", "Black/White"],
      ["White", ""],
    ]);

    const kept = await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: { ...input, variants: created.values.variants, styles: [{ color: "Black" }] },
    });
    expect(kept.values.styles[0]?.colourShown).toBe("Black/White");

    const cleared = await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: { ...input, variants: created.values.variants, styles: [{ color: "Black", colourShown: "" }] },
    });
    expect(cleared.values.styles[0]?.colourShown).toBe("");
    const audit = await db.auditLog.findFirst({ where: { action: "product.create" } });
    expect(audit?.diff).toMatchObject({ styles: 2 });
  });
});

describe("what saveProduct hands back to the editor", () => {
  beforeEach(resetDatabase);

  it("returns the editor's values after the save: variant ids, made SKUs and descriptions, style numbers", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ variants: [row("Black", "M"), row("Black", "L")] });

    const saved = await catalogService.saveProduct(admin.id, { product: input });

    const forEdit = await adminReads.getProductForEdit(saved.id);
    expect(saved).toEqual({
      id: forEdit.id,
      slug: "oversized-tee",
      savedAt: forEdit.updatedAt.toISOString(),
      values: forEdit.values,
    });
    expect(saved.values.variants).toEqual([
      expect.objectContaining({ id: expect.any(String), sku: "VZ-OVERSIZEDTEE-BLACK-M", color: "Black" }),
      expect.objectContaining({ id: expect.any(String), sku: "VZ-OVERSIZEDTEE-BLACK-L", color: "Black" }),
    ]);
    expect(saved.values.images).toEqual([
      { url: "virzeen/products/tee/front", alt: "Oversized Tee", color: "" },
    ]);
    expect(saved.values.styles).toEqual([
      { color: "Black", colourShown: "", code: expect.stringMatching(/^VZ\d{4,}-101$/) },
    ]);

    // Sending the values back changes nothing: no new variants, styles or numbers.
    const again = await catalogService.saveProduct(admin.id, { id: saved.id, product: saved.values });
    expect(again.values).toEqual(saved.values);
    expect(await db.productVariant.count()).toBe(2);
    expect(await db.productStyle.count()).toBe(1);
  });
});

describe("drafts and descriptions", () => {
  beforeEach(resetDatabase);

  it("saves a draft without a description, and refuses to publish it until it has one", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ description: "", isPublished: false });
    const draft = await catalogService.saveProduct(admin.id, { product: input });
    expect(draft.values.description).toBe("");

    await expect(
      catalogService.saveProduct(admin.id, {
        id: draft.id,
        product: { ...draft.values, isPublished: true },
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      fields: { description: "Add a description before publishing" },
    });
  });

  it("createDraft makes a draft from a name, category and price, with origin China and a style number", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory();

    const { id } = await catalogService.createDraft(admin.id, {
      name: "Monochrome Beanie",
      categoryId: category.id,
      pricePaisa: 135_000,
    });
    const again = await catalogService.createDraft(admin.id, {
      name: "Monochrome Beanie",
      categoryId: category.id,
      pricePaisa: 135_000,
    });

    const draft = await adminReads.getProductForEdit(id);
    const prefix = await prefixOf(id);
    expect(draft.values).toMatchObject({
      name: "Monochrome Beanie",
      slug: "monochrome-beanie",
      description: "",
      countryOfOrigin: "China",
      categoryId: category.id,
      isPublished: false,
      images: [],
      shippingPaisa: 0,
      styles: [{ color: "", colourShown: "", code: `${prefix}-101` }],
      variants: [
        {
          sku: "VZ-MONOCHROMEBE-STD",
          size: "",
          color: "",
          pricePaisa: 135_000,
          stock: 0,
          isActive: true,
        },
      ],
    });
    expect((await adminReads.getProductForEdit(again.id)).slug).toBe("monochrome-beanie-2");
    expect(await catalogReads.getProductBySlug("monochrome-beanie")).toBeNull();
    const audit = await db.auditLog.findFirst({ where: { entityId: id } });
    expect(audit).toMatchObject({ action: "product.create", actorId: admin.id });
  });

  it("createDraft refuses an archived category in the form's words", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory();
    await db.category.update({ where: { id: category.id }, data: { archivedAt: new Date() } });

    await expect(
      catalogService.createDraft(admin.id, { name: "Beanie", categoryId: category.id, pricePaisa: 100_000 }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED", fields: { categoryId: "Choose a category" } });
  });
});

describe("styles in duplicates and in the shop", () => {
  beforeEach(resetDatabase);

  it("gives a duplicate its own number and style numbers, copying the colour shown and the origin", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const source = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        countryOfOrigin: "",
        variants: [row("Black"), row("White")],
        styles: [{ color: "Black", colourShown: "Black/White" }, { color: "White" }],
      }),
    });

    const copy = await catalogService.duplicateProduct(admin.id, source.id);

    const [sourcePrefix, copyPrefix] = [await prefixOf(source.id), await prefixOf(copy.id)];
    expect(copyPrefix).not.toBe(sourcePrefix);
    expect(copy.values.styles).toEqual([
      { color: "Black", colourShown: "Black/White", code: `${copyPrefix}-101` },
      { color: "White", colourShown: "", code: `${copyPrefix}-102` },
    ]);
    expect(copy.values.countryOfOrigin).toBe("China");
    expect(await codesOf(source.id)).toEqual({ Black: `${sourcePrefix}-101`, White: `${sourcePrefix}-102` });
  });

  it("getProductBySlug gives each colour for sale its style number and colour shown (else its name)", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const created = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        variants: [row("Black"), row("White"), row("Red", "M", { isActive: false })],
        styles: [{ color: "Black", colourShown: "Black/White" }],
      }),
    });
    const prefix = await prefixOf(created.id);

    const page = await catalogReads.getProductBySlug("oversized-tee");

    expect(page?.countryOfOrigin).toBe("China");
    expect(page?.styles).toEqual([
      { color: "Black", code: `${prefix}-101`, colourShown: "Black/White" },
      { color: "White", code: `${prefix}-102`, colourShown: "White" },
    ]);

    // Older rows may have spaces around the colour; style rows hold it trimmed (like the migration's backfill).
    await db.productVariant.updateMany({
      where: { productId: created.id, color: "White" },
      data: { color: " White " },
    });
    expect((await catalogReads.getProductBySlug("oversized-tee"))?.styles[1]).toEqual({
      color: " White ",
      code: `${prefix}-102`,
      colourShown: "White",
    });
  });
});

describe("catalogReads.listRelatedByCategory (You may also like)", () => {
  beforeEach(resetDatabase);

  it("lists published products of the category, newest first, without the one left out", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    const save = (slug: string, overrides: Partial<ProductData> = {}) =>
      catalogService.saveProduct(admin.id, { product: { ...input, slug, ...overrides } });
    const first = await save("first-tee");
    await db.product.update({
      where: { id: first.id },
      data: { publishedAt: new Date(Date.now() - 60_000) },
    });
    const second = await save("second-tee");
    await save("draft-tee", { isPublished: false });
    await save("other-category-tee", { categoryId: (await createCategory()).id });

    const all = await catalogReads.listRelatedByCategory({ categoryId: input.categoryId });
    const others = await catalogReads.listRelatedByCategory({
      categoryId: input.categoryId,
      excludeId: second.id,
    });

    expect(all.map((item) => item.slug)).toEqual(["second-tee", "first-tee"]);
    expect(others.map((item) => item.slug)).toEqual(["first-tee"]);
    expect(await catalogReads.listRelated({ id: first.id, categoryId: input.categoryId })).toMatchObject([
      { slug: "second-tee" },
    ]);
    expect(await catalogReads.listRelatedByCategory({ categoryId: input.categoryId, limit: 1 })).toHaveLength(
      1,
    );
  });
});

describe("catalogReads.listRecommendations (specs/product-page-v2.md)", () => {
  beforeEach(resetDatabase);

  it("lists the category without the product, and the other categories, published only, newest first", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    const otherCategory = (await createCategory()).id;
    const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
    const save = async (slug: string, overrides: Partial<ProductData> = {}, publishedAt?: Date) => {
      const saved = await catalogService.saveProduct(admin.id, { product: { ...input, slug, ...overrides } });
      if (publishedAt) await db.product.update({ where: { id: saved.id }, data: { publishedAt } });
      return saved;
    };
    const current = await save("this-tee", {}, minutesAgo(10));
    await save("older-tee", {}, minutesAgo(5));
    await save("newer-tee", {}, minutesAgo(1));
    await save("draft-tee", { isPublished: false });
    await save("older-cap", { categoryId: otherCategory }, minutesAgo(4));
    await save("newer-cap", { categoryId: otherCategory }, minutesAgo(2));
    await save("draft-cap", { categoryId: otherCategory, isPublished: false });
    // Published, but nothing for sale any more.
    const switchedOff = await save("switched-off-cap", { categoryId: otherCategory });
    await db.productVariant.updateMany({ where: { productId: switchedOff.id }, data: { isActive: false } });
    const archived = await save("archived-cap", { categoryId: otherCategory });
    await catalogService.archiveProduct(admin.id, archived.id);

    const slugs = (list: { slug: string }[]) => list.map((item) => item.slug);
    const all = await catalogReads.listRecommendations({
      categoryId: input.categoryId,
      excludeId: current.id,
    });
    expect(slugs(all.sameCategory)).toEqual(["newer-tee", "older-tee"]);
    expect(slugs(all.otherCategories)).toEqual(["newer-cap", "older-cap"]);

    // Without a product to leave out (a draft's Preview), the whole category.
    const whole = await catalogReads.listRecommendations({ categoryId: input.categoryId });
    expect(slugs(whole.sameCategory)).toEqual(["newer-tee", "older-tee", "this-tee"]);

    const one = await catalogReads.listRecommendations({
      categoryId: input.categoryId,
      excludeId: current.id,
      limit: 1,
    });
    expect({ same: slugs(one.sameCategory), other: slugs(one.otherCategories) }).toEqual({
      same: ["newer-tee"],
      other: ["newer-cap"],
    });

    // Seen from the other category, the tees are "More from Virzeen".
    const fromCap = await catalogReads.listRecommendations({ categoryId: otherCategory });
    expect(slugs(fromCap.otherCategories)).toEqual(["newer-tee", "older-tee", "this-tee"]);
  });

  it("gives two empty lists when there is nothing else to show", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    const only = await catalogService.saveProduct(admin.id, { product: input });

    expect(
      await catalogReads.listRecommendations({ categoryId: input.categoryId, excludeId: only.id }),
    ).toEqual({ sameCategory: [], otherCategories: [] });
  });

  it("shows up to 8 in each list by default", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    for (let index = 0; index < 9; index++) {
      await catalogService.saveProduct(admin.id, { product: { ...input, slug: `tee-${index}` } });
    }

    const lists = await catalogReads.listRecommendations({ categoryId: input.categoryId });

    expect(lists.sameCategory).toHaveLength(8);
    expect(lists.otherCategories).toEqual([]);
  });
});

describe("favourites follow renamed styles (saveProduct)", () => {
  beforeEach(resetDatabase);

  /** Each customer's favourites of the product, as "name: style" (sorted). */
  async function favouritesOf(productId: string, names: Record<string, string>) {
    const rows = await db.favourite.findMany({ where: { productId }, select: { userId: true, color: true } });
    return rows.map((row) => `${names[row.userId]}: ${row.color}`).sort();
  }

  it("moves favourites to the new name, also when two styles swap names, keeping one per customer", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const [asha, bina, chandra] = [await createUser(), await createUser(), await createUser()];
    const names = { [asha.id]: "asha", [bina.id]: "bina", [chandra.id]: "chandra" };
    const input = await productInput({ variants: [row("Black"), row("White")] });
    const created = await catalogService.saveProduct(admin.id, { product: input });
    const other = await catalogService.saveProduct(admin.id, {
      product: await productInput({ slug: "other-tee", variants: [row("Black")] }),
    });
    const prefix = await prefixOf(created.id);
    const [black, white] = created.values.variants;
    await db.favourite.createMany({
      data: [
        { userId: asha.id, productId: created.id, color: "Black" },
        // Bina has the old name and, from an older list, the new one: she keeps one.
        { userId: bina.id, productId: created.id, color: "Black" },
        { userId: bina.id, productId: created.id, color: "Noir" },
        { userId: chandra.id, productId: created.id, color: "White" },
        // Another product's Black stays as it is.
        { userId: asha.id, productId: other.id, color: "Black" },
      ],
    });

    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: {
        ...input,
        variants: [
          { ...black!, color: "Noir" },
          { ...white!, color: "White" },
        ],
        styles: [
          { color: "Noir", code: `${prefix}-101` },
          { color: "White", code: `${prefix}-102` },
        ],
      },
    });
    expect(await favouritesOf(created.id, names)).toEqual(["asha: Noir", "bina: Noir", "chandra: White"]);

    // Swap the names: each favourite stays with its style.
    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: {
        ...input,
        variants: [
          { ...black!, color: "White" },
          { ...white!, color: "Noir" },
        ],
        styles: [
          { color: "White", code: `${prefix}-101` },
          { color: "Noir", code: `${prefix}-102` },
        ],
      },
    });
    expect(await favouritesOf(created.id, names)).toEqual(["asha: White", "bina: White", "chandra: Noir"]);
    expect(await favouritesOf(other.id, names)).toEqual(["asha: Black"]);
  });

  it("leaves a removed style's favourites on its old row when a rename takes its name", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const asha = await createUser();
    const input = await productInput({ variants: [row("Black"), row("White")] });
    const created = await catalogService.saveProduct(admin.id, { product: input });
    const prefix = await prefixOf(created.id);
    const [black] = created.values.variants;
    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: { ...input, variants: [black!], styles: [] },
    });
    const [savedWhite, savedBlack] = [new Date("2026-09-01T00:00:00Z"), new Date("2026-09-02T00:00:00Z")];
    await db.favourite.createMany({
      data: [
        { userId: asha.id, productId: created.id, color: "White", createdAt: savedWhite },
        { userId: asha.id, productId: created.id, color: "Black", createdAt: savedBlack },
      ],
    });

    // White was removed; Black is renamed White.
    await catalogService.saveProduct(admin.id, {
      id: created.id,
      product: {
        ...input,
        variants: [{ ...black!, color: "White" }],
        styles: [{ color: "White", code: `${prefix}-101` }],
      },
    });

    // The old Black's favourite is now White's; the removed White's follows its row, so it names no style for sale.
    const rows = await db.favourite.findMany({
      where: { productId: created.id },
      select: { color: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toEqual([
      { color: `White (${prefix}-102)`, createdAt: savedWhite },
      { color: "White", createdAt: savedBlack },
    ]);
  });
});
