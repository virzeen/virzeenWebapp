"use client";

import type { SizeChart, SizeGuideFormValues } from "@virzeen/validators";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  addMeasurement,
  addSize,
  moveItem,
  moveMeasurement,
  moveSize,
  removeItem,
  removeMeasurement,
  removeSize,
} from "./size-chart";
import { pasteIntoChart, type GridCell, type PasteResult } from "./size-chart-paste";

type ChartPath =
  `chart.columns.${number}` | `chart.rows.${number}.size` | `chart.rows.${number}.values.${number}`;

// Measurements and sizes are plain values, so the lists get keys of their own that move with them.
let lastKey = 0;
const newKey = () => `chart-${++lastKey}`;
const newKeys = (count: number) => Array.from({ length: Math.max(count, 0) }, newKey);

/**
 * The size table editor's state (specs/product-page-v2.md "Size guides"): the chart lives in the form ("chart"), the
 * keys here. The inputs are controlled: moving a size or measurement changes which form path each input edits.
 */
export function useSizeChart() {
  const form = useFormContext<SizeGuideFormValues>();
  const chart = useWatch({ control: form.control, name: "chart" });
  const [storedColumnKeys, setColumnKeys] = useState(() => chart.columns.map(newKey));
  const [storedRowKeys, setRowKeys] = useState(() => chart.rows.map(newKey));
  // Only a form reset with another shape gets here: start the keys again.
  let columnKeys = storedColumnKeys;
  if (columnKeys.length !== chart.columns.length) {
    columnKeys = chart.columns.map(newKey);
    setColumnKeys(columnKeys);
  }
  let rowKeys = storedRowKeys;
  if (rowKeys.length !== chart.rows.length) {
    rowKeys = chart.rows.map(newKey);
    setRowKeys(rowKeys);
  }

  function update(next: SizeChart) {
    form.setValue("chart", next, { shouldDirty: true });
    // Errors belong to places in the chart: after a save attempt check it again, before one start clean.
    if (form.formState.isSubmitted) void form.trigger("chart");
    else form.clearErrors("chart");
  }

  return {
    columns: chart.columns,
    rows: chart.rows,
    columnKeys,
    rowKeys,
    addColumn() {
      update(addMeasurement(chart));
      setColumnKeys([...columnKeys, newKey()]);
    },
    moveColumn(from: number, to: number) {
      update(moveMeasurement(chart, from, to));
      setColumnKeys(moveItem(columnKeys, from, to));
    },
    removeColumn(index: number) {
      update(removeMeasurement(chart, index));
      setColumnKeys(removeItem(columnKeys, index));
    },
    addRow() {
      update(addSize(chart));
      setRowKeys([...rowKeys, newKey()]);
    },
    moveRow(from: number, to: number) {
      update(moveSize(chart, from, to));
      setRowKeys(moveItem(rowKeys, from, to));
    },
    removeRow(index: number) {
      update(removeSize(chart, index));
      setRowKeys(removeItem(rowKeys, index));
    },
    /** A whole new table (a template): every box is new. */
    replace(next: SizeChart) {
      update(next);
      setColumnKeys(next.columns.map(newKey));
      setRowKeys(next.rows.map(newKey));
    },
    /**
     * What pasting cells copied from a spreadsheet at `at` would make, without changing anything yet: cells filled in
     * from there (sizes and measurements added at the end as needed), or a whole copied table in place of this one
     * (`replaced`, which asks first when something is typed).
     */
    planPaste(at: GridCell, block: string[][]): PasteResult {
      return pasteIntoChart(chart, at, block);
    },
    /** Puts a planned paste in the table. A replaced table's boxes are all new, so focus must be put back. */
    applyPaste(result: PasteResult) {
      update(result.chart);
      if (result.replaced) {
        setColumnKeys(result.chart.columns.map(newKey));
        setRowKeys(result.chart.rows.map(newKey));
      } else {
        setColumnKeys([...columnKeys, ...newKeys(result.addedColumns)]);
        setRowKeys([...rowKeys, ...newKeys(result.addedRows)]);
      }
    },
    /** Typing in a box: checked as you type only after a save attempt (like the other fields). */
    change(path: ChartPath, value: string) {
      form.setValue(path, value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    },
    /** Leaving a box checks it, like the other fields (mode onBlur). */
    check(path: ChartPath) {
      void form.trigger(path);
    },
  };
}

export type SizeChartState = ReturnType<typeof useSizeChart>;
