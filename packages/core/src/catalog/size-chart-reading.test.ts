import { sizeChartSchema, type SizeChartReading } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { isAppError } from "../errors";
import { interpretChartReading, normaliseValue, PICTURE_READING_MESSAGES } from "./size-chart-reading";

// The supplier chart from the owner's first picture (XS to L, Chinese headings, no unit stated).
const SUPPLIER: SizeChartReading = {
  readable: true,
  unit: "unknown",
  multipleTables: false,
  columns: ["Chest", "Shoulder", "Sleeve", "Length", "Weight"],
  rows: [
    { size: "XS", values: ["106", "51", "50", "59", "1.320"] },
    { size: "S", values: ["110", "52", "51", "60", "1.320"] },
    { size: "M", values: ["114", "53", "52", "61", "1.320"] },
    { size: "L", values: ["118", "54", "53", "62", "1.320"] },
  ],
  skipped: [],
  note: "",
};

const reading = (changes: Partial<SizeChartReading>): SizeChartReading => ({ ...SUPPLIER, ...changes });

function refusedWith(input: SizeChartReading) {
  try {
    interpretChartReading(input);
  } catch (error) {
    if (isAppError(error)) return { code: error.code, message: error.message };
    throw error;
  }
  return null;
}

describe("normaliseValue", () => {
  it("keeps numbers and ranges", () => {
    expect(normaliseValue("96")).toBe("96");
    expect(normaliseValue(" 96.5 ")).toBe("96.5");
    expect(normaliseValue("96-101")).toBe("96-101");
  });

  it("writes every kind of range with a hyphen and drops the unit", () => {
    expect(normaliseValue("96~101")).toBe("96-101");
    expect(normaliseValue("96–101")).toBe("96-101");
    expect(normaliseValue("96 to 101")).toBe("96-101");
    expect(normaliseValue("96 - 101 cm")).toBe("96-101");
    expect(normaliseValue("106cm")).toBe("106");
  });

  it("reads full-width digits and tildes from a Chinese table", () => {
    expect(normaliseValue("１０６")).toBe("106");
    expect(normaliseValue("９６～１０１")).toBe("96-101");
  });

  it("leaves blank cells and 'doesn't apply' marks empty without counting them as unreadable", () => {
    for (const mark of ["", "  ", "-", "—", "/", "N/A", "无"]) expect(normaliseValue(mark)).toBe("");
  });

  it("refuses anything else", () => {
    expect(normaliseValue("M")).toBeNull();
    expect(normaliseValue("about 96")).toBeNull();
    expect(normaliseValue("1.320kg")).toBeNull();
    expect(normaliseValue("1".repeat(21))).toBeNull();
  });
});

describe("interpretChartReading", () => {
  it("makes the table from a supplier chart and says the unit was assumed", () => {
    const result = interpretChartReading(SUPPLIER);
    expect(result.chart.columns).toEqual(["Chest", "Shoulder", "Sleeve", "Length", "Weight"]);
    expect(result.chart.rows[0]).toEqual({ size: "XS", values: ["106", "51", "50", "59", "1.320"] });
    expect(result.unitUnknown).toBe(true);
    expect(sizeChartSchema.safeParse(result.chart).success).toBe(true);
  });

  it("reports the headings the reader left out, tidied, without repeats, five at most", () => {
    const result = interpretChartReading(
      reading({ skipped: [" Weight ", "Weight", "Price", "SKU", "Colour", "Fabric", "Brand", "Origin", ""] }),
    );
    expect(result.skipped).toEqual(["Weight", "Price", "SKU", "Colour", "Fabric"]);
  });

  it("does not call the unit unknown when the picture says cm", () => {
    expect(interpretChartReading(reading({ unit: "cm" })).unitUnknown).toBe(false);
  });

  it("refuses a picture that isn't a size chart, without a table", () => {
    expect(refusedWith(reading({ readable: false }))).toEqual({
      code: "VALIDATION_FAILED",
      message: PICTURE_READING_MESSAGES.notAChart,
    });
  });

  it("refuses a chart in inches rather than converting it", () => {
    expect(refusedWith(reading({ unit: "in" }))).toEqual({
      code: "VALIDATION_FAILED",
      message: PICTURE_READING_MESSAGES.inches,
    });
  });

  it("refuses a reply with no measurements or no sizes", () => {
    expect(refusedWith(reading({ columns: [], rows: [] }))?.message).toBe(PICTURE_READING_MESSAGES.notAChart);
    expect(refusedWith(reading({ columns: ["", " "] }))?.message).toBe(PICTURE_READING_MESSAGES.notAChart);
    expect(refusedWith(reading({ rows: [{ size: " ", values: ["1"] }] }))?.message).toBe(
      PICTURE_READING_MESSAGES.notAChart,
    );
  });

  it("drops a column whose heading came back empty, with its values", () => {
    const result = interpretChartReading(
      reading({
        columns: ["Chest", "", "Length"],
        rows: [{ size: "M", values: ["114", "99", "61"] }],
      }),
    );
    expect(result.chart.columns).toEqual(["Chest", "Length"]);
    expect(result.chart.rows[0]?.values).toEqual(["114", "61"]);
  });

  it("pads a short row with blanks and ignores extra values", () => {
    const result = interpretChartReading(
      reading({
        columns: ["Chest", "Length"],
        rows: [
          { size: "S", values: ["110"] },
          { size: "M", values: ["114", "61", "999"] },
        ],
      }),
    );
    expect(result.chart.rows).toEqual([
      { size: "S", values: ["110", ""] },
      { size: "M", values: ["114", "61"] },
    ]);
    expect(result.blankedValues).toBe(0);
  });

  it("leaves a value that isn't a number blank and counts it", () => {
    const result = interpretChartReading(
      reading({
        columns: ["Chest"],
        rows: [
          { size: "S", values: ["one hundred"] },
          { size: "M", values: ["114"] },
        ],
      }),
    );
    expect(result.chart.rows.map((row) => row.values[0])).toEqual(["", "114"]);
    expect(result.blankedValues).toBe(1);
  });

  it("keeps to six measurements and twenty sizes, counting what was cut", () => {
    const columns = Array.from({ length: 8 }, (_, index) => `M${index + 1}`);
    const rows = Array.from({ length: 23 }, (_, index) => ({
      size: `S${index + 1}`,
      values: columns.map(() => "50"),
    }));
    const result = interpretChartReading(reading({ columns, rows }));
    expect(result.chart.columns).toHaveLength(6);
    expect(result.chart.rows).toHaveLength(20);
    expect(result.cutColumns).toBe(2);
    expect(result.cutRows).toBe(3);
    expect(sizeChartSchema.safeParse(result.chart).success).toBe(true);
  });

  it("cuts long names and sizes to the table's lengths", () => {
    const result = interpretChartReading(
      reading({
        columns: ["A very long measurement name that goes on"],
        rows: [{ size: "An extremely long size name here", values: ["50"] }],
      }),
    );
    expect(result.chart.columns[0]).toHaveLength(30);
    expect(result.chart.rows[0]?.size).toHaveLength(20);
    expect(sizeChartSchema.safeParse(result.chart).success).toBe(true);
  });

  it("keeps two measurements with the same name for the grid to flag on Save", () => {
    const result = interpretChartReading(
      reading({ columns: ["Chest", "chest"], rows: [{ size: "M", values: ["114", "115"] }] }),
    );
    expect(result.chart.columns).toEqual(["Chest", "chest"]);
  });

  it("tidies the footnote and cuts it to 500 characters", () => {
    expect(interpretChartReading(reading({ note: "  Measured flat,\n allow 1-2 cm.  " })).note).toBe(
      "Measured flat, allow 1-2 cm.",
    );
    expect(interpretChartReading(reading({ note: "x".repeat(900) })).note).toHaveLength(500);
  });

  it("passes on that the picture has more than one table", () => {
    expect(interpretChartReading(reading({ multipleTables: true })).multipleTables).toBe(true);
  });
});
