import type { SizeChart } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import {
  addMeasurement,
  addSize,
  measurementName,
  moveMeasurement,
  moveSize,
  removeMeasurement,
  removeSize,
} from "./size-chart";

const chart: SizeChart = {
  columns: ["Chest", "Length", "Sleeve"],
  rows: [
    { size: "M", values: ["96-101", "72", "61"] },
    { size: "L", values: ["102-107", "74", ""] },
  ],
};

describe("size chart editor", () => {
  it("adds a measurement with a blank value for every size", () => {
    expect(addMeasurement(chart)).toEqual({
      columns: ["Chest", "Length", "Sleeve", ""],
      rows: [
        { size: "M", values: ["96-101", "72", "61", ""] },
        { size: "L", values: ["102-107", "74", "", ""] },
      ],
    });
  });

  it("moves a measurement's values with it", () => {
    expect(moveMeasurement(chart, 2, 0)).toEqual({
      columns: ["Sleeve", "Chest", "Length"],
      rows: [
        { size: "M", values: ["61", "96-101", "72"] },
        { size: "L", values: ["", "102-107", "74"] },
      ],
    });
  });

  it("removes a measurement's values with it", () => {
    expect(removeMeasurement(chart, 1)).toEqual({
      columns: ["Chest", "Sleeve"],
      rows: [
        { size: "M", values: ["96-101", "61"] },
        { size: "L", values: ["102-107", ""] },
      ],
    });
  });

  it("adds, moves and removes sizes", () => {
    const added = addSize(chart);
    expect(added.rows.at(-1)).toEqual({ size: "", values: ["", "", ""] });
    expect(moveSize(chart, 1, 0).rows.map((row) => row.size)).toEqual(["L", "M"]);
    expect(removeSize(chart, 0)).toEqual({ columns: chart.columns, rows: [chart.rows[1]] });
  });

  it("names a blank measurement by its place", () => {
    expect(measurementName(" Chest ", 0)).toBe("Chest");
    expect(measurementName("  ", 1)).toBe("Measurement 2");
  });
});
