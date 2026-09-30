import { describe, expect, it } from "vitest";
import { sizeGridColumns } from "./size-grid";

describe("sizeGridColumns", () => {
  it("keeps short sizes 5 in a row", () => {
    expect(sizeGridColumns(["XS", "S", "M", "XXXL"])).toContain("/5)");
    expect(sizeGridColumns([])).toContain("/5)");
  });

  it("widens the boxes for the longest name", () => {
    expect(sizeGridColumns(["S", "28×32"])).toContain("/4)");
    expect(sizeGridColumns(["6×50×6", "60×60×40"])).toContain("/3)");
    expect(sizeGridColumns(["One size fits"])).toContain("/2)");
  });

  it("counts characters, not UTF-16 units, and ignores outer spaces", () => {
    expect(sizeGridColumns(["  XXL  "])).toContain("/5)");
    expect(sizeGridColumns(["60×60"])).toContain("/4)");
  });

  it("puts very long names one per row", () => {
    expect(sizeGridColumns(["Extra large and long"])).toBe("grid-cols-1");
  });
});
