"use client";

import type { SizeChart, SizeGuideInput } from "@virzeen/validators";
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

type ChartPath =
  `chart.columns.${number}` | `chart.rows.${number}.size` | `chart.rows.${number}.values.${number}`;

// Measurements and sizes are plain values, so the lists get keys of their own that move with them.
let lastKey = 0;
const newKey = () => `chart-${++lastKey}`;

/**
 * The size chart editor's state (specs/size-guides.md): the chart lives in the form ("chart"), the list keys here.
 * The inputs are controlled: moving a size or measurement changes which form path each input edits.
 */
export function useSizeChart() {
  const form = useFormContext<SizeGuideInput>();
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
