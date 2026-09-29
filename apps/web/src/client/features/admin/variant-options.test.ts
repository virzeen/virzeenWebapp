import { describe, expect, it } from "vitest";
import {
  addOption,
  optionsFromRows,
  pricesDiffer,
  removeOption,
  renameOption,
  sortRows,
  styleSummary,
  variantLabel,
  type VariantRow,
} from "./variant-options";

const row = (color: string, size: string, extra: Partial<VariantRow> = {}): VariantRow => ({
  sku: "",
  color,
  size,
  pricePaisa: 135_000,
  stock: 0,
  isActive: true,
  ...extra,
});
const newRow = (size: string, color: string) => row(color, size);
const keys = (rows: VariantRow[]) => rows.map((r) => `${variantLabel(r)}${r.isActive ? "" : " (off)"}`);

describe("variant options", () => {
  it("puts the first size on the row there is, then adds a row per size", () => {
    let rows = [row("", "", { stock: 4 })];
    rows = addOption(rows, "size", "S", { sizes: [], colors: [] }, newRow);
    expect(rows).toEqual([row("", "S", { stock: 4 })]);
    rows = addOption(rows, "size", "M", { sizes: ["S"], colors: [] }, newRow);
    expect(keys(rows)).toEqual(["S", "M"]);
  });

  it("makes every colour × size combination", () => {
    let rows = [row("", "S"), row("", "M")];
    rows = addOption(rows, "color", "Black", { sizes: ["S", "M"], colors: [] }, newRow);
    rows = addOption(rows, "color", "White", { sizes: ["S", "M"], colors: ["Black"] }, newRow);
    expect(keys(rows)).toEqual(["Black, S", "Black, M", "White, S", "White, M"]);
  });

  it("drops unsaved rows of a removed size and switches saved ones off", () => {
    const rows = [row("Black", "S", { id: "saved1" }), row("Black", "M"), row("Black", "L")];
    const next = removeOption(rows, "size", "S", { sizes: ["S", "M", "L"], colors: ["Black"] });
    expect(keys(next)).toEqual(["Black, S (off)", "Black, M", "Black, L"]);
    expect(keys(removeOption(next, "size", "M", { sizes: ["M", "L"], colors: ["Black"] }))).toEqual([
      "Black, S (off)",
      "Black, L",
    ]);
  });

  it("switches a saved row back on when its size is added again, instead of adding another", () => {
    const rows = [row("Black", "S", { id: "saved1", isActive: false, stock: 7 }), row("Black", "M")];
    const next = addOption(rows, "size", "s", { sizes: ["M"], colors: ["Black"] }, newRow);
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ id: "saved1", isActive: true, stock: 7 });
  });

  it("clears the last size from the rows instead of removing them", () => {
    const rows = [row("Black", "Free size", { id: "saved1" }), row("White", "Free size")];
    expect(
      keys(removeOption(rows, "size", "Free size", { sizes: ["Free size"], colors: ["Black", "White"] })),
    ).toEqual(["Black", "White"]);
  });

  it("reads the options from the rows for sale, ignoring case repeats", () => {
    const rows = [row("Black", "M"), row("black", "L"), row("Red", "XL", { isActive: false })];
    expect(optionsFromRows(rows)).toEqual({ sizes: ["M", "L"], colors: ["Black"] });
  });

  it("orders rows by colour then size, leftovers last", () => {
    const rows = [
      row("White", "M"),
      row("Grey", "S", { id: "old", isActive: false }),
      row("Black", "M"),
      row("Black", "S"),
    ];
    expect(keys(sortRows(rows, { sizes: ["S", "M"], colors: ["Black", "White"] }))).toEqual([
      "Black, S",
      "Black, M",
      "White, M",
      "Grey, S (off)",
    ]);
  });

  it("notices different prices, treating two blanks as the same", () => {
    expect(pricesDiffer([row("", "S"), row("", "M")])).toBe(false);
    expect(pricesDiffer([row("", "S"), row("", "M", { pricePaisa: 150_000 })])).toBe(true);
    expect(
      pricesDiffer([row("", "S", { pricePaisa: Number.NaN }), row("", "M", { pricePaisa: Number.NaN })]),
    ).toBe(false);
  });

  it("renames a style on every row that has it, saved rows included", () => {
    const rows = [row("Mountain", "S", { id: "saved1" }), row("Mountain", "M"), row("River", "S")];
    expect(keys(renameOption(rows, "color", "mountain", "Mountain print"))).toEqual([
      "Mountain print, S",
      "Mountain print, M",
      "River, S",
    ]);
  });

  it("sums a style's stock for sale and its price range for the style list", () => {
    const rows = [
      row("Mountain", "S", { stock: 3, pricePaisa: 165_000 }),
      row("Mountain", "M", { stock: 2, pricePaisa: 175_000 }),
      row("Mountain", "L", { stock: 9, pricePaisa: 99_000, isActive: false }),
      row("River", "S", { stock: 5 }),
    ];
    expect(styleSummary(rows, "mountain")).toEqual({
      minPaisa: 165_000,
      maxPaisa: 175_000,
      stock: 5,
      forSale: true,
    });
    expect(styleSummary([row("New", "S", { pricePaisa: Number.NaN })], "New")).toEqual({
      minPaisa: null,
      maxPaisa: null,
      stock: 0,
      forSale: true,
    });
    expect(styleSummary([row("Old", "S", { isActive: false, stock: 4 })], "Old")).toMatchObject({
      minPaisa: 135_000,
      stock: 0,
      forSale: false,
    });
  });
});
