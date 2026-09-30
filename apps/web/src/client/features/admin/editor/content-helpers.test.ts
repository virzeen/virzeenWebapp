import { productSchema } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { linesProblem, styleEntryIndex } from "./content-helpers";

describe("the style entry behind Colour shown and Style", () => {
  const entries = [
    { color: "", colourShown: "", code: "VZ0042-101" },
    { color: "Black", colourShown: "Black/White", code: "VZ0042-102" },
  ];

  it("finds a style's entry by name, ignoring case and spaces at the ends", () => {
    expect(styleEntryIndex(entries, "Black")).toBe(1);
    expect(styleEntryIndex(entries, " black ")).toBe(1);
  });

  it("finds the one entry of a product without styles", () => {
    expect(styleEntryIndex(entries, "")).toBe(0);
  });

  it("says -1 for a style without an entry yet", () => {
    expect(styleEntryIndex(entries, "Bone")).toBe(-1);
  });
});

describe("one-per-line boxes", () => {
  it("accepts lines within the limits, blank lines left out", () => {
    expect(linesProblem(productSchema.shape.details, "100% cotton\n\n  Pre-washed ")).toBeNull();
    expect(linesProblem(productSchema.shape.details, "")).toBeNull();
  });

  it("names the line with a problem as it is in the box", () => {
    const text = `Soft cotton\n\n${"x".repeat(201)}`;
    expect(linesProblem(productSchema.shape.details, text)).toBe(
      "Line 3: Keep each line under 200 characters",
    );
  });

  it("gives the list's own problem", () => {
    const text = Array.from({ length: 13 }, (_, i) => `Benefit ${i + 1}`).join("\n");
    expect(linesProblem(productSchema.shape.benefits, text)).toBe("Add up to 12 benefits");
  });
});
