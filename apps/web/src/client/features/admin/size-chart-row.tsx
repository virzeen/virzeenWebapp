"use client";

import { Input } from "@virzeen/ui";
import type { SizeGuideFormValues } from "@virzeen/validators";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useId } from "react";
import { useFormContext } from "react-hook-form";
import { measurementName, sizeName } from "./size-chart";
import { cellError, gridCellClass, gridStickyClass, type GridBoxHandlers } from "./size-chart-cells";
import { SizeChartMenu } from "./size-chart-menu";
import type { SizeChartState } from "./use-size-chart";

type SizeChartRowProps = GridBoxHandlers & {
  chart: SizeChartState;
  index: number;
  onMove: (index: number, to: number) => void;
  onRemove: (index: number) => void;
};

/**
 * One size in the size table: its name (the pinned first column), a value in cm per measurement, and its menu (Move
 * up, Move down, Remove). The row is tinted while a box in it has focus.
 */
export function SizeChartRow({ chart, index: r, onMove, onRemove, box }: SizeChartRowProps) {
  const form = useFormContext<SizeGuideFormValues>();
  const errors = form.formState.errors.chart?.rows?.[r];
  const idBase = useId();
  const row = chart.rows[r] ?? { size: "", values: [] };
  const count = chart.rows.length;
  const rowName = sizeName(row.size, r);
  const menuName = row.size.trim() ? `size ${row.size.trim()}` : `row ${r + 1}`;
  const size = cellError(`${idBase}-size`, errors?.size?.message ?? errors?.values?.message);

  return (
    <tr className="group focus-within:bg-surface">
      <td className={gridStickyClass}>
        <Input
          aria-label={`Size, row ${r + 1}`}
          className="w-24"
          maxLength={20}
          autoComplete="off"
          placeholder={r === 0 ? "e.g. M" : undefined}
          value={row.size}
          onChange={(e) => chart.change(`chart.rows.${r}.size`, e.target.value)}
          onBlur={() => chart.check(`chart.rows.${r}.size`)}
          {...box(r, 0)}
          {...size.props}
        />
        {size.line}
      </td>
      {chart.columns.map((column, c) => {
        const columnKey = chart.columnKeys[c] ?? "";
        const value = cellError(`${idBase}-${columnKey}`, errors?.values?.[c]?.message);
        return (
          <td key={columnKey} className={gridCellClass}>
            <Input
              aria-label={`${measurementName(column, c)} (cm), ${rowName}`}
              className="w-full min-w-24"
              maxLength={20}
              autoComplete="off"
              value={row.values[c] ?? ""}
              onChange={(e) => chart.change(`chart.rows.${r}.values.${c}`, e.target.value)}
              onBlur={() => chart.check(`chart.rows.${r}.values.${c}`)}
              {...box(r, c + 1)}
              {...value.props}
            />
            {value.line}
          </td>
        );
      })}
      <td className={gridCellClass}>
        <SizeChartMenu
          label={`Move or remove ${menuName}`}
          menuId={`row:${r}`}
          actions={[
            { label: "Move up", icon: ArrowUp, disabled: r === 0, onSelect: () => onMove(r, r - 1) },
            {
              label: "Move down",
              icon: ArrowDown,
              disabled: r === count - 1,
              onSelect: () => onMove(r, r + 1),
            },
            { label: "Remove", icon: Trash2, disabled: count === 1, onSelect: () => onRemove(r) },
          ]}
        />
      </td>
    </tr>
  );
}
