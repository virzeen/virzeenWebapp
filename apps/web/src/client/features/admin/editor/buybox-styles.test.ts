import { describe, expect, it } from "vitest";
import { styleEntryIndex, stylesAfterAdd, withColourShown } from "./buybox-styles";

const black = { color: "Black", colourShown: "Black/White", code: "VZ0042-101" };
const white = { color: "White", colourShown: "", code: "VZ0042-102" };

describe("styleEntryIndex", () => {
  it("finds the same spelling first, then another case", () => {
    expect(styleEntryIndex([black, white], "White")).toBe(1);
    expect(styleEntryIndex([{ ...black, color: "black" }, black], "Black")).toBe(1);
    expect(styleEntryIndex([black], " black ")).toBe(0);
    expect(styleEntryIndex([black], "Bone")).toBe(-1);
  });
});

describe("stylesAfterAdd", () => {
  it("adds a new entry, numbered when saved", () => {
    expect(stylesAfterAdd([black], "Bone", true)).toEqual([
      black,
      { color: "Bone", colourShown: "", code: "" },
    ]);
  });

  it("gives a removed style added back (any case) its entry and number again", () => {
    expect(stylesAfterAdd([black, white], "white", true)).toEqual([black, { ...white, color: "white" }]);
  });

  it("lets a product's first style take over the entry of no style", () => {
    const plain = { color: "", colourShown: "", code: "VZ0042-101" };
    expect(stylesAfterAdd([plain], "Black", false)).toEqual([{ ...plain, color: "Black" }]);
  });

  it("prefers a removed style's own entry over the entry of no style", () => {
    const plain = { color: "", code: "VZ0042-102" };
    expect(stylesAfterAdd([white, plain], "White", false)).toEqual([white, plain]);
  });

  it("keeps the entry of no style once the product has styles", () => {
    const plain = { color: "", code: "VZ0042-101" };
    expect(stylesAfterAdd([plain, black], "Bone", true)).toHaveLength(3);
  });
});

describe("withColourShown", () => {
  it("sets the style's colour shown", () => {
    expect(withColourShown([black, white], "White", "Snow")).toEqual([
      black,
      { ...white, colourShown: "Snow" },
    ]);
  });

  it("adds an entry for a style that has none yet", () => {
    expect(withColourShown([black], "Bone", "Natural")).toEqual([
      black,
      { color: "Bone", colourShown: "Natural", code: "" },
    ]);
  });
});
