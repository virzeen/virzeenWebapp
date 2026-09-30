import { describe, expect, it } from "vitest";
import { MAX_SIDE, renamed, targetSize } from "./shrink-image";

describe("targetSize", () => {
  it("caps the longest side and keeps the shape", () => {
    expect(targetSize(4032, 3024)).toEqual({ width: MAX_SIDE, height: 1800 });
    expect(targetSize(3024, 4032)).toEqual({ width: 1800, height: MAX_SIDE });
  });

  it("never enlarges a small photo", () => {
    expect(targetSize(1200, 1500)).toEqual({ width: 1200, height: 1500 });
  });
});

describe("renamed", () => {
  it("swaps the extension for the new format", () => {
    expect(renamed("IMG_2041.HEIC", "image/webp")).toBe("IMG_2041.webp");
    expect(renamed("linen shirt.png", "image/jpeg")).toBe("linen shirt.jpg");
    expect(renamed(".jpg", "image/webp")).toBe("photo.webp");
  });
});
