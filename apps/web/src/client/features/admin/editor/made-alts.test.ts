import { describe, expect, it } from "vitest";
import { isMadePhotoAlt, photoAltResets } from "./made-alts";

describe("made photo descriptions", () => {
  it("knows the ones the save makes, with and without a style and a photo number", () => {
    expect(isMadePhotoAlt("Tee", "Tee", "")).toBe(true);
    expect(isMadePhotoAlt("Tee, photo 3", "Tee", "")).toBe(true);
    expect(isMadePhotoAlt("Tee, Mountain print", "Tee", "Mountain print")).toBe(true);
    expect(isMadePhotoAlt("Tee, Mountain print, photo 2", "Tee", "Mountain print")).toBe(true);
  });

  it("leaves typed ones, blank ones and other products' ones alone", () => {
    expect(isMadePhotoAlt("Tee on a model", "Tee", "")).toBe(false);
    expect(isMadePhotoAlt("Tee, photo two", "Tee", "")).toBe(false);
    expect(isMadePhotoAlt("", "Tee", "")).toBe(false);
    expect(isMadePhotoAlt("Top, Black", "Tee", "Black")).toBe(false);
    expect(isMadePhotoAlt("Tee, Black", "Tee", "")).toBe(false);
  });

  it("clears the made ones a rename would leave behind", () => {
    const images = [
      { url: "a", alt: "Tee, Black", color: "Black" },
      { url: "b", alt: "Tee, Black, photo 2", color: "Black" },
      { url: "c", alt: "Size chart", color: "" },
      { url: "d", alt: "Tee, photo 2", color: "" },
    ];
    expect(photoAltResets(images, (style) => ({ name: "Tee", style }))).toEqual([
      { name: "images.0.alt", value: "" },
      { name: "images.1.alt", value: "" },
      { name: "images.3.alt", value: "" },
    ]);
  });

  it("clears only the group asked for, made with the name it had", () => {
    const images = [
      { url: "a", alt: "Tee, Black", color: "Jet" },
      { url: "b", alt: "Tee, White", color: "White" },
    ];
    const resets = photoAltResets(images, (style) =>
      style === "Jet" ? { name: "Tee", style: "Black" } : null,
    );
    expect(resets).toEqual([{ name: "images.0.alt", value: "" }]);
  });
});
