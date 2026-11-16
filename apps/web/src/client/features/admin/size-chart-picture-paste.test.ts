import { describe, expect, it } from "vitest";
import { pastedPicture } from "./size-chart-picture-paste";

const file = (type: string, name = "image") => new File([new Uint8Array([1])], name, { type });

describe("pastedPicture", () => {
  it("takes a screenshot or copied image (a picture and nothing else on the clipboard)", () => {
    const picture = file("image/png", "image.png");
    expect(pastedPicture({ types: ["Files"], files: [picture] })).toBe(picture);
  });

  it("takes a JPG or WebP too", () => {
    for (const type of ["image/jpeg", "image/webp"]) {
      const picture = file(type);
      expect(pastedPicture({ types: ["Files"], files: [picture] })).toBe(picture);
    }
  });

  it("leaves cells copied from a spreadsheet to the table's own paste, even with a picture of them", () => {
    expect(
      pastedPicture({ types: ["text/plain", "text/html", "Files"], files: [file("image/png")] }),
    ).toBeNull();
  });

  it("leaves plain text alone", () => {
    expect(pastedPicture({ types: ["text/plain"], files: [] })).toBeNull();
  });

  it("ignores files that aren't JPG, PNG or WebP", () => {
    expect(
      pastedPicture({ types: ["Files"], files: [file("application/pdf"), file("image/gif")] }),
    ).toBeNull();
  });

  it("takes the first readable picture among the files", () => {
    const first = file("image/png", "first.png");
    expect(
      pastedPicture({ types: ["Files"], files: [file("application/pdf"), first, file("image/webp")] }),
    ).toBe(first);
  });
});
