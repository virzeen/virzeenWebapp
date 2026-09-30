import type { SizeChart } from "@virzeen/validators";

// Ready-made starting tables for a Clothing size guide (specs/product-page-v2.md "Size guides"). The values are left
// blank for the owner to fill in.

const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const SIZE_CHART_TEMPLATES = [
  {
    id: "tops",
    name: "Tops",
    summary: "Chest, Length, Sleeve · XS to XXL",
    columns: ["Chest", "Length", "Sleeve"],
    sizes: LETTER_SIZES,
  },
  {
    id: "bottoms",
    name: "Bottoms",
    summary: "Waist, Hip, Inseam · XS to XXL",
    columns: ["Waist", "Hip", "Inseam"],
    sizes: LETTER_SIZES,
  },
  { id: "blank", name: "Blank", summary: "Your own measurements and sizes", columns: [""], sizes: [""] },
] as const;

export type SizeChartTemplate = (typeof SIZE_CHART_TEMPLATES)[number];
export type SizeChartTemplateId = SizeChartTemplate["id"];

/** The table a template starts: its measurements and sizes, with every value blank. */
export function templateChart(id: SizeChartTemplateId): SizeChart {
  const template = SIZE_CHART_TEMPLATES.find((candidate) => candidate.id === id) ?? SIZE_CHART_TEMPLATES[2];
  return {
    columns: [...template.columns],
    rows: template.sizes.map((size) => ({ size, values: template.columns.map(() => "") })),
  };
}

/** An empty table: one blank measurement and one blank size (a new guide, or "Blank"). */
export const emptyChart = () => templateChart("blank");

const blank = (text: string) => text.trim() === "";

/** Nothing typed yet: every measurement name, size and value is blank (or the table has no cells at all). */
export const isBlankChart = (chart: SizeChart) =>
  chart.columns.every(blank) && chart.rows.every((row) => blank(row.size) && row.values.every(blank));
