import { describe, expect, it } from "vitest";
import { galleryFor, hasStylePhotos, initialStyle, styleFromParam, tilePhotoFor } from "./style-photos";

const photo = (id: string, color: string | null) => ({ id, color });
const ids = (photos: { id: string }[]) => photos.map((p) => p.id);

describe("style photos (specs/product-styles.md, specs/product-page.md)", () => {
  const styles = ["Mountain", "River"];
  const images = [
    photo("m1", "Mountain"),
    photo("m2", "Mountain"),
    photo("r1", "River"),
    photo("chart", null),
  ];

  it("shows only the picked style's photos", () => {
    expect(ids(galleryFor(images, "River", styles))).toEqual(["r1"]);
    expect(ids(galleryFor(images, "Mountain", styles))).toEqual(["m1", "m2"]);
  });

  it("falls back to the shared photos, then to the first style that has photos", () => {
    expect(ids(galleryFor(images, null, styles))).toEqual(["chart"]);
    expect(ids(galleryFor(images, "Sky", [...styles, "Sky"]))).toEqual(["chart"]);
    expect(ids(galleryFor(images.slice(0, 3), null, styles))).toEqual(["m1", "m2"]);
    expect(ids(galleryFor([photo("r1", "River")], "Mountain", styles))).toEqual(["r1"]);
    // A photo of a style that isn't sold any more counts as shared rather than disappearing.
    expect(ids(galleryFor([photo("old", "Sky"), photo("r1", "River")], "Mountain", styles))).toEqual(["old"]);
  });

  it("shows every photo of a product without style photos", () => {
    const plain = [photo("a", null), photo("b", null)];
    expect(ids(galleryFor(plain, "Mountain", styles))).toEqual(["a", "b"]);
    expect(ids(galleryFor([], "Mountain", styles))).toEqual([]);
  });

  it("picks the first style with stock, and knows when styles have photos", () => {
    const variants = [
      { color: "Mountain", stock: 0 },
      { color: "River", stock: 2 },
    ];
    expect(initialStyle(variants, styles)).toBe("River");
    expect(initialStyle([{ color: "Mountain", stock: 0 }], styles)).toBeNull();
    expect(hasStylePhotos(images, styles)).toBe(true);
    expect(hasStylePhotos([photo("a", null)], styles)).toBe(false);
  });

  it("opens the style a ?style= link names when it exists and has stock", () => {
    const variants = [
      { color: "Mountain", stock: 3 },
      { color: "River", stock: 2 },
      { color: "Sky", stock: 0 },
    ];
    const all = [...styles, "Sky"];
    expect(styleFromParam("River", variants, all)).toBe("River");
    expect(styleFromParam("Sky", variants, all)).toBe("Mountain"); // sold out
    expect(styleFromParam("Nope", variants, all)).toBe("Mountain"); // unknown
    expect(styleFromParam(undefined, variants, all)).toBe("Mountain");
    expect(styleFromParam("river", variants, all)).toBe("Mountain"); // names match exactly
  });

  it("gives each tile its style's first photo, else the main photo", () => {
    expect(tilePhotoFor(images, "River")?.id).toBe("r1");
    expect(tilePhotoFor(images, "Sky")?.id).toBe("m1");
    expect(tilePhotoFor([], "Sky")).toBeUndefined();
  });
});
