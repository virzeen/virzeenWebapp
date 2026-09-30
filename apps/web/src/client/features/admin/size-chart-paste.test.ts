import type { SizeChart } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { isCellBlock, parseClipboardTable, pasteIntoChart } from "./size-chart-paste";

const chart: SizeChart = {
  columns: ["Chest", "Length"],
  rows: [
    { size: "S", values: ["90", "70"] },
    { size: "M", values: ["96", "72"] },
  ],
};

describe("parseClipboardTable", () => {
  it("splits rows on new lines and cells on tabs", () => {
    expect(parseClipboardTable("S\t90\t70\nM\t96\t72")).toEqual([
      ["S", "90", "70"],
      ["M", "96", "72"],
    ]);
  });

  it("reads Windows line endings and leaves out the copy's last new line", () => {
    expect(parseClipboardTable("S\t90\r\nM\t96\r\n")).toEqual([
      ["S", "90"],
      ["M", "96"],
    ]);
    expect(parseClipboardTable("S\t90\r\n\r\n")).toEqual([["S", "90"]]);
  });

  it("keeps blank cells in their place", () => {
    expect(parseClipboardTable("S\t\t70\n\t96\t")).toEqual([
      ["S", "", "70"],
      ["", "96", ""],
    ]);
  });

  it("trims cells", () => {
    expect(parseClipboardTable("  S \t 96 - 101 ")).toEqual([["S", "96 - 101"]]);
  });

  it("reads quoted cells with tabs, line breaks and quotes inside", () => {
    expect(parseClipboardTable('"Free\nsize"\t"say ""hi"""\t"a\tb"\nM\t1\t2')).toEqual([
      ["Free size", 'say "hi"', "a b"],
      ["M", "1", "2"],
    ]);
  });

  it("reads a quote that never closes as plain text", () => {
    expect(parseClipboardTable('"96\t72\nM\t1')).toEqual([
      ['"96', "72"],
      ["M", "1"],
    ]);
  });

  it("leaves out empty columns on the right, but keeps blank cells inside the block", () => {
    expect(parseClipboardTable("80\t60\t58\t\r\n84\t62\t59\t\r\n")).toEqual([
      ["80", "60", "58"],
      ["84", "62", "59"],
    ]);
    expect(parseClipboardTable("80\t\t\n\t62\t")).toEqual([
      ["80", ""],
      ["", "62"],
    ]);
    expect(parseClipboardTable("\t\t\n\t\t")).toEqual([]);
  });

  it("gives nothing for empty text", () => {
    expect(parseClipboardTable("")).toEqual([]);
    expect(parseClipboardTable("\n\n")).toEqual([]);
  });

  it("tells a block of cells from a single value", () => {
    expect(isCellBlock(parseClipboardTable("96"))).toBe(false);
    expect(isCellBlock(parseClipboardTable("96\n"))).toBe(false);
    expect(isCellBlock(parseClipboardTable("96\t72"))).toBe(true);
    expect(isCellBlock(parseClipboardTable("96\n72"))).toBe(true);
    expect(isCellBlock([])).toBe(false);
  });
});

describe("pasteIntoChart", () => {
  it("fills cells from the box pasted into, replacing what's there", () => {
    const result = pasteIntoChart(chart, { row: 0, col: 1 }, [
      ["91", "71"],
      ["97", ""],
    ]);
    expect(result.chart).toEqual({
      columns: ["Chest", "Length"],
      rows: [
        { size: "S", values: ["91", "71"] },
        { size: "M", values: ["97", ""] },
      ],
    });
    expect(result).toMatchObject({ dropped: 0, addedColumns: 0, addedRows: 0 });
  });

  it("fills sizes from the Size column and names from the header row", () => {
    expect(pasteIntoChart(chart, { row: 0, col: 0 }, [["XS"], ["XL"]]).chart.rows.map((r) => r.size)).toEqual(
      ["XS", "XL"],
    );
    const named = pasteIntoChart(chart, { row: -1, col: 1 }, [
      ["Bust", "Waist"],
      ["80", "60"],
    ]);
    expect(named.chart.columns).toEqual(["Bust", "Waist"]);
    expect(named.chart.rows[0]).toEqual({ size: "S", values: ["80", "60"] });
  });

  it("adds sizes and measurements at the end as needed, blank where nothing was pasted", () => {
    const result = pasteIntoChart(chart, { row: 1, col: 2 }, [
      ["72", "60"],
      ["74", "62"],
    ]);
    expect(result.chart).toEqual({
      columns: ["Chest", "Length", ""],
      rows: [
        { size: "S", values: ["90", "70", ""] },
        { size: "M", values: ["96", "72", "60"] },
        { size: "", values: ["", "74", "62"] },
      ],
    });
    expect(result).toMatchObject({ dropped: 0, addedColumns: 1, addedRows: 1 });
  });

  it("stops at the limits and counts the cells with text that didn't fit", () => {
    const result = pasteIntoChart(
      chart,
      { row: 1, col: 1 },
      [
        ["1", "2", "3"],
        ["4", "", "6"],
        ["7", "8", "9"],
      ],
      { columns: 3, rows: 3 },
    );
    expect(result.chart.columns).toHaveLength(3);
    expect(result.chart.rows).toHaveLength(3);
    expect(result.chart.rows[2]).toEqual({ size: "", values: ["4", "", "6"] });
    // The third pasted row (3 cells) had no size left to go to.
    expect(result.dropped).toBe(3);
  });

  it("places a whole copied table, Size heading and all, from the top-left corner", () => {
    const block = parseClipboardTable(
      "Size\tChest\tLength\tSleeve\nS\t90\t70\t60\nM\t96\t72\t61\nL\t102\t74\t62\n",
    );
    const result = pasteIntoChart(chart, { row: 1, col: 2 }, block);
    expect(result.chart).toEqual({
      columns: ["Chest", "Length", "Sleeve"],
      rows: [
        { size: "S", values: ["90", "70", "60"] },
        { size: "M", values: ["96", "72", "61"] },
        { size: "L", values: ["102", "74", "62"] },
      ],
    });
    expect(result).toMatchObject({ dropped: 0, replaced: true });
  });

  it("replaces the table with a whole copied one, so no sizes are left over (e.g. from a template)", () => {
    const template: SizeChart = {
      columns: ["Chest", "Length", "Sleeve"],
      rows: ["XS", "S", "M", "L", "XL", "XXL"].map((size) => ({ size, values: ["", "", ""] })),
    };
    const result = pasteIntoChart(template, { row: 0, col: 1 }, [
      ["Sizes", "Chest"],
      ["M", "96"],
      ["L", "102"],
    ]);
    expect(result.chart).toEqual({
      columns: ["Chest"],
      rows: [
        { size: "M", values: ["96"] },
        { size: "L", values: ["102"] },
      ],
    });
    expect(result.replaced).toBe(true);
  });

  it("reads a whole table with an empty top-left corner when pasted into the names or the sizes", () => {
    const block = [
      ["", "Chest", "Length"],
      ["S", "90", "70"],
      ["M", "96", "72"],
    ];
    const whole = {
      columns: ["Chest", "Length"],
      rows: [
        { size: "S", values: ["90", "70"] },
        { size: "M", values: ["96", "72"] },
      ],
    };
    expect(pasteIntoChart(chart, { row: -1, col: 1 }, block).chart).toEqual(whole);
    expect(pasteIntoChart(chart, { row: 1, col: 0 }, block).chart).toEqual(whole);
    // Pasted among the values, an empty first cell is just an empty value.
    const values = pasteIntoChart(chart, { row: 0, col: 1 }, block);
    expect(values.replaced).toBe(false);
    expect(values.chart.rows[0]).toEqual({ size: "S", values: ["", "Chest", "Length"] });
  });

  it("doesn't read numbers across the top as measurement names", () => {
    const result = pasteIntoChart(chart, { row: 0, col: 0 }, [
      ["", "96", "72"],
      ["L", "102", "74"],
    ]);
    expect(result.replaced).toBe(false);
    expect(result.chart.rows[0]).toEqual({ size: "", values: ["96", "72"] });
    expect(result.chart.rows[1]).toEqual({ size: "L", values: ["102", "74"] });
  });

  it("fills the sizes from the top with a copied Size column, heading and all, keeping the measurements", () => {
    const result = pasteIntoChart(chart, { row: 1, col: 0 }, [["Size"], ["XS"], ["S"], ["M"]]);
    expect(result.replaced).toBe(false);
    expect(result.chart).toEqual({
      columns: ["Chest", "Length"],
      rows: [
        { size: "XS", values: ["90", "70"] },
        { size: "S", values: ["96", "72"] },
        { size: "M", values: ["", ""] },
      ],
    });
    expect(result.addedRows).toBe(1);
  });

  it("doesn't add a blank measurement for an empty column copied on the right", () => {
    const template: SizeChart = {
      columns: ["Chest", "Length", "Sleeve"],
      rows: ["XS", "S"].map((size) => ({ size, values: ["", "", ""] })),
    };
    const result = pasteIntoChart(
      template,
      { row: 0, col: 1 },
      parseClipboardTable("80\t60\t58\t\r\n84\t62\t59\t\r\n"),
    );
    expect(result.chart.columns).toEqual(["Chest", "Length", "Sleeve"]);
    expect(result.chart.rows[1]).toEqual({ size: "S", values: ["84", "62", "59"] });
    expect(result.addedColumns).toBe(0);
  });

  it("fills in the names from a copied heading row on its own, keeping the sizes and values", () => {
    const result = pasteIntoChart(
      chart,
      { row: -1, col: 1 },
      parseClipboardTable("Size\tChest\tLength\tSleeve\r\n"),
    );
    expect(result.replaced).toBe(false);
    expect(result.chart).toEqual({
      columns: ["Chest", "Length", "Sleeve"],
      rows: [
        { size: "S", values: ["90", "70", ""] },
        { size: "M", values: ["96", "72", ""] },
      ],
    });
    expect(result).toMatchObject({ addedColumns: 1, addedRows: 0 });
  });

  it("fills in sizes that start with the word Size, like any other rows", () => {
    const result = pasteIntoChart(
      chart,
      { row: 0, col: 0 },
      parseClipboardTable("Size 4\t60\t40\nSize 6\t64\t44"),
    );
    expect(result.replaced).toBe(false);
    expect(result.chart).toEqual({
      columns: ["Chest", "Length"],
      rows: [
        { size: "Size 4", values: ["60", "40"] },
        { size: "Size 6", values: ["64", "44"] },
      ],
    });
  });

  it("reads a Size heading with a note in brackets as the heading", () => {
    const result = pasteIntoChart(chart, { row: 0, col: 1 }, [
      ["SIZE (EU)", "Chest"],
      ["38", "88"],
    ]);
    expect(result.replaced).toBe(true);
    expect(result.chart).toEqual({ columns: ["Chest"], rows: [{ size: "38", values: ["88"] }] });
  });

  it("doesn't change the chart it was given", () => {
    const before = structuredClone(chart);
    pasteIntoChart(chart, { row: 0, col: 1 }, [["1", "2", "3"]]);
    expect(chart).toEqual(before);
  });
});
