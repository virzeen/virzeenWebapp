import { describe, expect, it } from "vitest";
import { galleryPhotos, landingStyle, photoMove, renamedStyle, uploadRoom } from "./media-photos";

const photo = (url: string, color = "") => ({ url, alt: "", color });

describe("galleryPhotos", () => {
  const images = [photo("a", "Black"), photo("chart"), photo("b", "White"), photo("c", "Black")];

  it("shows only the picked style's photos, with their place in the whole list", () => {
    expect(galleryPhotos(images, "Black", ["Black", "White"])).toEqual({
      photos: [
        { index: 0, url: "a", alt: "" },
        { index: 3, url: "c", alt: "" },
      ],
      shared: false,
    });
  });

  it("shows the shared photos (and those of styles gone) when the style has none of its own", () => {
    const withOld = [...images, photo("old", "Red")];
    expect(galleryPhotos(withOld, "Bone", ["Black", "White", "Bone"])).toEqual({
      photos: [
        { index: 1, url: "chart", alt: "" },
        { index: 4, url: "old", alt: "" },
      ],
      shared: true,
    });
  });

  it("shows nothing, not another style's photos, when there are no shared ones either", () => {
    expect(galleryPhotos([photo("a", "Black")], "White", ["Black", "White"])).toEqual({
      photos: [],
      shared: false,
    });
  });

  it("shows every photo of a product without styles", () => {
    expect(galleryPhotos([photo("x"), photo("y", "Old")], "", []).photos.map((p) => p.url)).toEqual([
      "x",
      "y",
    ]);
  });

  it("treats a colour with spaces as the style", () => {
    expect(galleryPhotos([photo("a", " Black ")], "Black", ["Black"]).photos).toHaveLength(1);
  });
});

describe("uploadRoom", () => {
  it("counts the style's own photos against 12", () => {
    const images = Array.from({ length: 10 }, (_, i) => photo(`p${i}`, "Black"));
    expect(uploadRoom(images, "Black", ["Black", "White"])).toBe(2);
    expect(uploadRoom(images, "White", ["Black", "White"])).toBe(12);
  });

  it("never passes 60 photos in all", () => {
    const images = Array.from({ length: 58 }, (_, i) => photo(`p${i}`, `S${i % 6}`));
    expect(uploadRoom(images, "New", ["New"])).toBe(2);
  });

  it("counts every photo of a product without styles", () => {
    expect(uploadRoom([photo("a"), photo("b")], "", [])).toBe(10);
  });
});

describe("photoMove", () => {
  const shown = [
    { index: 0, url: "a", alt: "" },
    { index: 3, url: "c", alt: "" },
    { index: 5, url: "d", alt: "" },
  ];

  it("maps shown positions to whole-list indexes", () => {
    expect(photoMove(shown, 2, 0)).toEqual([5, 0]);
    expect(photoMove(shown, 0, 1)).toEqual([0, 3]);
  });

  it("does nothing for a missing photo or no move", () => {
    expect(photoMove(shown, 1, 1)).toBeNull();
    expect(photoMove(shown, 3, 0)).toBeNull();
  });
});

describe("renamedStyle", () => {
  it("finds the one name that changed", () => {
    expect(renamedStyle(["Black", "White"], ["Black", "Snow"])).toEqual({ from: "White", to: "Snow" });
    expect(renamedStyle(["black"], ["Black"])).toEqual({ from: "black", to: "Black" });
  });

  it("ignores adds, removals and no change", () => {
    expect(renamedStyle(["Black"], ["Black", "White"])).toBeNull();
    expect(renamedStyle(["Black", "White"], ["White"])).toBeNull();
    expect(renamedStyle(["Black"], ["Black"])).toBeNull();
  });
});

describe("landingStyle", () => {
  it("keeps the style the upload was started for", () => {
    expect(landingStyle("Black", new Map(), ["Black", "White"])).toBe("Black");
  });

  it("follows renames made meanwhile, even twice", () => {
    const renames = new Map([
      ["Black", "Jet"],
      ["Jet", "Jet black"],
    ]);
    expect(landingStyle("Black", renames, ["Jet black", "White"])).toBe("Jet black");
  });

  it("drops the photo when its style was removed", () => {
    expect(landingStyle("Red", new Map(), ["Black"])).toBeNull();
    expect(landingStyle("A", new Map([["A", "B"]]), ["C"])).toBeNull();
  });

  it("makes it shared when the product has no styles now, or it was started without", () => {
    expect(landingStyle("Black", new Map(), [])).toBe("");
    expect(landingStyle("", new Map(), ["Black"])).toBe("");
  });

  it("stops on a loop of renames", () => {
    const renames = new Map([
      ["A", "B"],
      ["B", "A"],
    ]);
    expect(landingStyle("A", renames, ["C"])).toBeNull();
  });
});
