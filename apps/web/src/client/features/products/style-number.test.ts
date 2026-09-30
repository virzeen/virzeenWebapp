import { describe, expect, it } from "vitest";
import { styleLines } from "./style-number";

const styles = [
  { color: "Black", code: "VZ0042-101", colourShown: "Black/White" },
  { color: "White", code: "VZ0042-102", colourShown: "White" },
];

describe("styleLines", () => {
  it("gives the picked style's colour shown and style number", () => {
    expect(styleLines(styles, "White", ["Black", "White"])).toEqual({
      colourShown: "White",
      code: "VZ0042-102",
    });
  });

  it("uses the first style when none is picked (everything sold out)", () => {
    expect(styleLines(styles, null, ["Black", "White"])).toEqual({
      colourShown: "Black/White",
      code: "VZ0042-101",
    });
  });

  it("falls back to the style's name, and hides the number of a style not saved yet", () => {
    expect(styleLines([{ color: "Red", code: "", colourShown: null }], "Red", ["Red"])).toEqual({
      colourShown: "Red",
      code: null,
    });
    expect(styleLines([], "Red", ["Red"])).toEqual({ colourShown: "Red", code: null });
  });

  it("shows only the style number for a product without styles, unless it has a colour shown", () => {
    expect(styleLines([{ color: "", code: "VZ0007-101", colourShown: null }], null, [])).toEqual({
      colourShown: null,
      code: "VZ0007-101",
    });
    expect(styleLines([{ color: "", code: "VZ0007-101", colourShown: "Black" }], null, [])).toEqual({
      colourShown: "Black",
      code: "VZ0007-101",
    });
  });
});
