import { featureRowsSchema, MAX_FEATURE_ROWS, type FeatureRow } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import {
  addRow,
  changeRow,
  moveRow,
  newFeatureRow,
  removeRow,
  rowCountOf,
  rowsHoldLine,
} from "./features-rows";

const wide: FeatureRow = { count: 1, shape: "LANDSCAPE" };
const pair: FeatureRow = { count: 2, shape: "PORTRAIT" };
const four: FeatureRow = { count: 4, shape: "PORTRAIT" };

describe("the Custom rows editor", () => {
  it("adds 2 portrait pictures at the end, up to 9 rows", () => {
    expect(newFeatureRow()).toEqual({ count: 2, shape: "PORTRAIT" });
    expect(addRow([])).toEqual([pair]);
    expect(addRow([wide])).toEqual([wide, pair]);
    const full = Array.from({ length: MAX_FEATURE_ROWS }, () => wide);
    expect(addRow(full)).toEqual(full);
    expect(featureRowsSchema.safeParse(addRow(addRow([]))).success).toBe(true);
  });

  it("moves a row up and down, and not past the ends", () => {
    expect(moveRow([wide, pair, four], 1, -1)).toEqual([pair, wide, four]);
    expect(moveRow([wide, pair, four], 1, 1)).toEqual([wide, four, pair]);
    expect(moveRow([wide, pair], 0, -1)).toEqual([wide, pair]);
    expect(moveRow([wide, pair], 1, 1)).toEqual([wide, pair]);
  });

  it("removes one row", () => {
    expect(removeRow([wide, pair, four], 1)).toEqual([wide, four]);
    expect(removeRow([wide], 0)).toEqual([]);
  });

  it("changes one row's count or shape and leaves the others", () => {
    expect(changeRow([wide, pair], 1, { count: 4 })).toEqual([wide, four]);
    expect(changeRow([wide, pair], 0, { shape: "PORTRAIT" })).toEqual([
      { count: 1, shape: "PORTRAIT" },
      pair,
    ]);
  });

  it("reads a picked count", () => {
    expect(rowCountOf("1")).toBe(1);
    expect(rowCountOf("4")).toBe(4);
    expect(rowCountOf("5")).toBeNull();
    expect(rowCountOf("")).toBeNull();
  });
});

describe("the line under the rows", () => {
  it("counts the pictures the rows hold against the features", () => {
    // The owner's example: 1 horizontal, 2 vertical, 4 in one row.
    expect(rowsHoldLine([wide, pair, four], 7)).toBe("These rows hold 7 pictures. You have 7.");
    expect(rowsHoldLine([wide, pair], 5)).toBe("These rows hold 3 pictures. You have 5.");
  });

  it("says row and picture in the singular when there is one", () => {
    expect(rowsHoldLine([wide], 1)).toBe("This row holds 1 picture. You have 1.");
    expect(rowsHoldLine([pair], 0)).toBe("This row holds 2 pictures. You have 0.");
  });

  it("says what happens with no rows", () => {
    expect(rowsHoldLine([], 3)).toBe("No rows yet, so the features show as Three across.");
  });
});
