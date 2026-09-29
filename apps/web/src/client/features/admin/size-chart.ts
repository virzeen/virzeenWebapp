import type { SizeChart } from "@virzeen/validators";

// The size guide editor's chart changes (specs/size-guides.md). Pure functions: the form keeps the chart, these
// work out the next one. A measurement is a column, so each change to one does the same to every size's values.

export const MAX_MEASUREMENTS = 6;
export const MAX_SIZES = 20;

/** A measurement's name for labels: "Chest", or "Measurement 2" while it's blank. */
export const measurementName = (column: string, index: number) => column.trim() || `Measurement ${index + 1}`;

export const moveItem = <T>(list: readonly T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
};
export const removeItem = <T>(list: readonly T[], index: number) => list.filter((_, i) => i !== index);

const eachSize = (chart: SizeChart, values: (row: readonly string[]) => string[]) =>
  chart.rows.map((row) => ({ ...row, values: values(row.values) }));

export const addMeasurement = (chart: SizeChart): SizeChart => ({
  columns: [...chart.columns, ""],
  rows: eachSize(chart, (values) => [...values, ""]),
});

export const moveMeasurement = (chart: SizeChart, from: number, to: number): SizeChart => ({
  columns: moveItem(chart.columns, from, to),
  rows: eachSize(chart, (values) => moveItem(values, from, to)),
});

export const removeMeasurement = (chart: SizeChart, index: number): SizeChart => ({
  columns: removeItem(chart.columns, index),
  rows: eachSize(chart, (values) => removeItem(values, index)),
});

/** A new size at the end, with a blank value for each measurement. */
export const addSize = (chart: SizeChart): SizeChart => ({
  ...chart,
  rows: [...chart.rows, { size: "", values: chart.columns.map(() => "") }],
});

export const moveSize = (chart: SizeChart, from: number, to: number): SizeChart => ({
  ...chart,
  rows: moveItem(chart.rows, from, to),
});

export const removeSize = (chart: SizeChart, index: number): SizeChart => ({
  ...chart,
  rows: removeItem(chart.rows, index),
});
