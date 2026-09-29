import type { ProductInput } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { diffPaths, sameValues, savedPatches } from "./merge-saved";

type Row = ProductInput["variants"][number];

const row = (color: string, size: string, extra: Partial<Row> = {}): Row => ({
  sku: "",
  color,
  size,
  pricePaisa: 150_000,
  stock: 0,
  isActive: true,
  ...extra,
});

const product = (extra: Partial<ProductInput> = {}): ProductInput => ({
  name: "Tee",
  slug: "tee",
  description: "",
  care: "",
  benefits: [],
  details: [],
  countryOfOrigin: "China",
  seoDescription: "",
  categoryId: "tz4a98xxat96iws9zmbrgj3a",
  sizeGuideId: "",
  collectionIds: [],
  isPublished: false,
  images: [],
  features: [],
  styles: [],
  shippingPaisa: 0,
  variants: [],
  ...extra,
});

describe("sameValues", () => {
  it("compares deeply and treats blank number boxes (NaN) as equal", () => {
    expect(sameValues({ a: [1, { b: Number.NaN }] }, { a: [1, { b: Number.NaN }] })).toBe(true);
    expect(sameValues({ a: [1, 2] }, { a: [1, 2, 3] })).toBe(false);
    expect(sameValues({ a: "x" }, { a: "x", b: undefined })).toBe(true);
  });
});

describe("diffPaths", () => {
  it("patches single fields, including inside rows, so field arrays keep their items", () => {
    const current = product({ variants: [row("", "M")], benefits: ["Soft"] });
    const target = product({
      name: "Tee!",
      variants: [row("", "M", { id: "v1", sku: "VZ-TEE-M" })],
      benefits: ["Soft"],
    });
    expect(diffPaths(current, target)).toEqual([
      { path: "name", value: "Tee!" },
      { path: "variants.0.sku", value: "VZ-TEE-M" },
      { path: "variants.0.id", value: "v1" },
    ]);
  });

  it("replaces a list whose length changed, and a list of plain values that differs", () => {
    const current = product({ variants: [row("", "M")], benefits: ["Soft"] });
    const target = product({ variants: [row("", "M"), row("", "L")], benefits: ["Soft", "Light"] });
    expect(diffPaths(current, target)).toEqual([
      { path: "benefits", value: ["Soft", "Light"] },
      { path: "variants", value: target.variants },
    ]);
  });
});

describe("savedPatches (edits made while a save was running)", () => {
  it("gives new rows their ids and made SKUs, matched by size and style, keeping the edits", () => {
    const sent = product({ variants: [row("", "M", { id: "v1", sku: "VZ-TEE-M" }), row("", "L")] });
    const saved = product({
      variants: [row("", "M", { id: "v1", sku: "VZ-TEE-M" }), row("", "L", { id: "v2", sku: "VZ-TEE-L" })],
    });
    // Meanwhile: stock typed on L, and a new size XL added.
    const current = product({
      variants: [row("", "M", { id: "v1", sku: "VZ-TEE-M" }), row("", "L", { stock: 4 }), row("", "XL")],
    });
    expect(savedPatches(sent, current, saved)).toEqual([
      { path: "variants.1.sku", value: "VZ-TEE-L" },
      { path: "variants.1.id", value: "v2" },
    ]);
  });

  it("follows a row renamed meanwhile by its place, and keeps a SKU typed meanwhile", () => {
    const sent = product({ variants: [row("Black", "M")] });
    const saved = product({ variants: [row("Black", "M", { id: "v1", sku: "VZ-TEE-BLACK-M" })] });
    const current = product({ variants: [row("Onyx", "M", { sku: "VZ-TEE-ONYX-M" })] });
    expect(savedPatches(sent, current, saved)).toEqual([{ path: "variants.0.id", value: "v1" }]);
  });

  it("gives new styles their numbers, even when renamed meanwhile, and keeps colour shown typed meanwhile", () => {
    const sent = product({
      styles: [
        { color: "Black", colourShown: "", code: "VZ0001-101" },
        { color: "White", colourShown: "", code: "" },
      ],
    });
    const saved = product({
      styles: [
        { color: "Black", colourShown: "", code: "VZ0001-101" },
        { color: "White", colourShown: "", code: "VZ0001-102" },
      ],
    });
    const current = product({
      styles: [
        { color: "Black", colourShown: "Black/White", code: "VZ0001-101" },
        { color: "Snow", colourShown: "", code: "" },
      ],
    });
    expect(savedPatches(sent, current, saved)).toEqual([{ path: "styles.1.code", value: "VZ0001-102" }]);
  });

  it("lets a product's first style take over the no-style number, and adds styles the server made", () => {
    const sent = product({
      styles: [{ color: "", colourShown: "", code: "VZ0001-101" }],
      variants: [row("Black", "M"), row("White", "M")],
    });
    const saved = product({
      styles: [
        { color: "Black", colourShown: "", code: "VZ0001-101" },
        { color: "White", colourShown: "", code: "VZ0001-102" },
      ],
    });
    const current = product({
      styles: [{ color: "", colourShown: "", code: "VZ0001-101" }],
      variants: [row("Black", "M", { stock: 3 }), row("White", "M")],
    });
    const patches = savedPatches(sent, current, saved);
    expect(patches.find((patch) => patch.path === "styles")).toEqual({
      path: "styles",
      value: [
        { color: "Black", colourShown: "", code: "VZ0001-101" },
        { color: "White", colourShown: "", code: "VZ0001-102" },
      ],
    });
  });

  it("fills blank photo descriptions with the made ones, matched by picture, and a changed slug", () => {
    const sent = product({ images: [{ url: "p/a", alt: "", color: "" }] });
    const saved = product({ slug: "tee-2", images: [{ url: "p/a", alt: "Tee", color: "" }] });
    const current = product({
      images: [
        { url: "p/b", alt: "", color: "" },
        { url: "p/a", alt: "", color: "" },
      ],
    });
    expect(savedPatches(sent, current, saved)).toEqual([
      { path: "images.1.alt", value: "Tee" },
      { path: "slug", value: "tee-2" },
    ]);
  });

  it("keeps a description cleared meanwhile blank, so the next save makes it again from the new title", () => {
    const feature = { imageUrl: "p/f", title: "Warm", body: "Rib knit.", alt: "Tee, Warm" };
    const sent = product({ features: [feature] });
    const current = product({ features: [{ ...feature, title: "Warmer", alt: "" }] });
    expect(savedPatches(sent, current, sent)).toEqual([]);
  });

  it("changes nothing when the save made nothing new", () => {
    const sent = product({ variants: [row("", "M", { id: "v1", sku: "VZ-TEE-M" })] });
    const current = product({ name: "Tee two", variants: sent.variants });
    expect(savedPatches(sent, current, sent)).toEqual([]);
  });
});
