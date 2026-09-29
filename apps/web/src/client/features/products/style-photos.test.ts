import { describe, expect, it } from "vitest";
import { galleryFor, hasStylePhotos, initialStyle } from "./style-photos";

const photo = (id: string, color: string | null) => ({ id, color });
const ids = (photos: { id: string }[]) => photos.map((p) => p.id);

describe("style photos (specs/product-styles.md)", () => {
  const styles = ["Mountain", "River"];
  const images = [
    photo("m1", "Mountain"),
    photo("m2", "Mountain"),
    photo("r1", "River"),
    photo("chart", null),
  ];

  it("shows the picked style's photos, then the shared ones", () => {
    expect(ids(galleryFor(images, "River", styles))).toEqual(["r1", "chart"]);
    expect(ids(galleryFor(images, "Mountain", styles))).toEqual(["m1", "m2", "chart"]);
  });

  it("falls back to the shared photos, then to the first style's", () => {
    expect(ids(galleryFor(images, null, styles))).toEqual(["chart"]);
    expect(ids(galleryFor(images.slice(0, 3), null, styles))).toEqual(["m1", "m2"]);
    // A photo of a style that isn't sold any more counts as shared rather than disappearing.
    expect(ids(galleryFor([photo("old", "Sky"), photo("m1", "Mountain")], "Mountain", styles))).toEqual([
      "m1",
      "old",
    ]);
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
});
