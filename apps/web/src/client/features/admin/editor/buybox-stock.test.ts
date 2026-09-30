import { describe, expect, it } from "vitest";
import { cellName, rowIndexFor, sizeCells } from "./buybox-stock";

const row = (size: string, color: string, stock: number, isActive = true) => ({
  size,
  color,
  stock,
  isActive,
});

describe("rowIndexFor", () => {
  const rows = [row("S", "Black", 3), row("M", "Black", 0), row("S", "White", 5), row("M", "White", 2)];

  it("finds the size's row for the picked style, ignoring case and spaces", () => {
    expect(rowIndexFor(rows, "M", "White")).toBe(3);
    expect(rowIndexFor(rows, " s ", "black")).toBe(0);
  });

  it("finds the row of a product without sizes", () => {
    expect(rowIndexFor([row("", "Black", 1), row("", "White", 2)], "", "White")).toBe(1);
  });

  it("takes any colour for a product without styles, a row for sale first", () => {
    expect(rowIndexFor([row("M", "Old", 1, false), row("M", "", 4)], "M", null)).toBe(1);
    expect(rowIndexFor([row("M", "Old", 1, false)], "M", null)).toBe(0);
  });

  it("says -1 when there's no row", () => {
    expect(rowIndexFor(rows, "XL", "Black")).toBe(-1);
  });
});

describe("sizeCells", () => {
  it("gives each size its row, sold out when the stock is 0 or blank", () => {
    const rows = [
      row("S", "Black", 3),
      row("M", "Black", 0),
      row("L", "Black", Number.NaN),
      row("S", "White", 1),
    ];
    expect(sizeCells(rows, ["S", "M", "L", "XL"], "Black")).toEqual([
      { size: "S", index: 0, soldOut: false, forSale: true },
      { size: "M", index: 1, soldOut: true, forSale: true },
      { size: "L", index: 2, soldOut: true, forSale: true },
      { size: "XL", index: -1, soldOut: true, forSale: false },
    ]);
  });

  it("marks a switched-off row as not for sale", () => {
    expect(sizeCells([row("M", "", 2, false)], ["M"], null)).toEqual([
      { size: "M", index: 0, soldOut: false, forSale: false },
    ]);
  });
});

describe("cellName", () => {
  it("names the inputs after the style and size", () => {
    expect(cellName("Black", "M")).toBe("Black, M");
    expect(cellName(null, "M")).toBe("M");
    expect(cellName("Black", "")).toBe("Black");
  });
});
