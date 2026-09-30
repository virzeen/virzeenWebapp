import { describe, expect, it } from "vitest";
import { emptyChart, isBlankChart, SIZE_CHART_TEMPLATES, templateChart } from "./size-chart-templates";

describe("size chart templates", () => {
  it("starts Tops with its measurements and XS to XXL, every value blank", () => {
    expect(templateChart("tops")).toEqual({
      columns: ["Chest", "Length", "Sleeve"],
      rows: ["XS", "S", "M", "L", "XL", "XXL"].map((size) => ({ size, values: ["", "", ""] })),
    });
  });

  it("starts Bottoms with Waist, Hip and Inseam", () => {
    const chart = templateChart("bottoms");
    expect(chart.columns).toEqual(["Waist", "Hip", "Inseam"]);
    expect(chart.rows.map((row) => row.size)).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
    expect(chart.rows.every((row) => row.values.length === 3 && row.values.every((v) => v === ""))).toBe(
      true,
    );
  });

  it("makes Blank one empty measurement and one empty size", () => {
    expect(templateChart("blank")).toEqual({ columns: [""], rows: [{ size: "", values: [""] }] });
    expect(emptyChart()).toEqual(templateChart("blank"));
  });

  it("gives a fresh table each time, so editing one doesn't change the template", () => {
    const first = templateChart("tops");
    first.columns[0] = "Bust";
    first.rows[0]!.values[0] = "80";
    expect(templateChart("tops").columns[0]).toBe("Chest");
    expect(templateChart("tops").rows[0]!.values[0]).toBe("");
  });

  it("lists Tops, Bottoms and Blank in that order", () => {
    expect(SIZE_CHART_TEMPLATES.map((template) => template.name)).toEqual(["Tops", "Bottoms", "Blank"]);
  });

  it("knows a blank table from one with something typed", () => {
    expect(isBlankChart(emptyChart())).toBe(true);
    expect(isBlankChart({ columns: [], rows: [] })).toBe(true);
    expect(isBlankChart({ columns: ["  "], rows: [{ size: " ", values: [" "] }] })).toBe(true);
    expect(isBlankChart(templateChart("tops"))).toBe(false);
    expect(isBlankChart({ columns: [""], rows: [{ size: "", values: ["96"] }] })).toBe(false);
    expect(isBlankChart({ columns: [""], rows: [{ size: "M", values: [""] }] })).toBe(false);
  });
});
