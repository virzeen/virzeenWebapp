import {
  SIZE_CHART_PICTURE_MAX_BYTES,
  SIZE_CHART_PICTURE_MAX_SIDE,
  SIZE_CHART_PICTURE_SERVER_MAX_BYTES,
} from "@virzeen/validators/limits";
import { describe, expect, it } from "vitest";
import { isReadablePictureType, MAX_SIDE, READING_ATTEMPTS, renamed, targetSize } from "./shrink-image";

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

describe("size chart pictures to be read", () => {
  it("accepts only JPG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"])
      expect(isReadablePictureType(type)).toBe(true);
    for (const type of ["image/gif", "image/heic", "image/svg+xml", "application/pdf", ""])
      expect(isReadablePictureType(type)).toBe(false);
  });

  it("tries a picture at 1600px first and only gets smaller from there, never over 1600px", () => {
    const sides = READING_ATTEMPTS.map(([side]) => side);
    expect(sides[0]).toBe(1600);
    expect(sides).toEqual([...sides].sort((a, b) => b - a));
    expect(Math.max(...sides)).toBe(SIZE_CHART_PICTURE_MAX_SIDE);
  });

  it("draws a big chart at 1600px on the long side and never enlarges a small one", () => {
    expect(targetSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(targetSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("stays under what a Server Action takes (1 MB), with room for the form around the file", () => {
    expect(SIZE_CHART_PICTURE_MAX_BYTES).toBeLessThan(SIZE_CHART_PICTURE_SERVER_MAX_BYTES);
    expect(SIZE_CHART_PICTURE_SERVER_MAX_BYTES).toBeLessThan(1024 * 1024);
  });
});
