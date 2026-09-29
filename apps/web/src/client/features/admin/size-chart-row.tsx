"use client";

import { Button, Input } from "@virzeen/ui";
import type { SizeGuideInput } from "@virzeen/validators";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useId } from "react";
import { useFormContext } from "react-hook-form";
import { measurementName } from "./size-chart";
import type { SizeChartState } from "./use-size-chart";

type SizeChartRowProps = {
  chart: SizeChartState;
  index: number;
  onMove: (index: number, to: number, action: "up" | "down") => void;
  onRemove: (index: number) => void;
};

/** One size in the chart table: its name, a value per measurement, and Move up, Move down, Remove. */
export function SizeChartRow({ chart, index: r, onMove, onRemove }: SizeChartRowProps) {
  const form = useFormContext<SizeGuideInput>();
  const errors = form.formState.errors.chart?.rows?.[r];
  const idBase = useId();
  const row = chart.rows[r] ?? { size: "", values: [] };
  const count = chart.rows.length;
  const rowName = row.size.trim() || `row ${r + 1}`;
  const buttonName = row.size.trim() ? `size ${row.size.trim()}` : `row ${r + 1}`;

  // An input's problem, linked to it for screen readers.
  const problem = (key: string, message: string | undefined) => ({
    props: {
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? `${idBase}-${key}` : undefined,
    },
    line: message ? (
      <p id={`${idBase}-${key}`} className="pt-1 text-small text-danger">
        {message}
      </p>
    ) : null,
  });
  const size = problem("size", errors?.size?.message);

  return (
    <tr>
      <td className="px-3 py-2 align-top">
        <Input
          aria-label={`Size, row ${r + 1}`}
          className="w-24"
          maxLength={20}
          autoComplete="off"
          value={row.size}
          onChange={(e) => chart.change(`chart.rows.${r}.size`, e.target.value)}
          onBlur={() => chart.check(`chart.rows.${r}.size`)}
          {...size.props}
        />
        {size.line}
      </td>
      {chart.columns.map((column, c) => {
        const columnKey = chart.columnKeys[c] ?? "";
        const value = problem(columnKey, errors?.values?.[c]?.message);
        return (
          <td key={columnKey} className="px-3 py-2 align-top">
            <Input
              aria-label={`${measurementName(column, c)} (cm), ${rowName}`}
              className="w-24"
              maxLength={20}
              autoComplete="off"
              value={row.values[c] ?? ""}
              onChange={(e) => chart.change(`chart.rows.${r}.values.${c}`, e.target.value)}
              onBlur={() => chart.check(`chart.rows.${r}.values.${c}`)}
              {...value.props}
            />
            {value.line}
          </td>
        );
      })}
      <td className="px-1 py-2 align-top">
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${buttonName} up`}
            data-action="up"
            disabled={r === 0}
            onClick={() => onMove(r, r - 1, "up")}
          >
            <ArrowUp className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Move ${buttonName} down`}
            data-action="down"
            disabled={r === count - 1}
            onClick={() => onMove(r, r + 1, "down")}
          >
            <ArrowDown className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${buttonName}`}
            data-action="remove"
            disabled={count === 1}
            onClick={() => onRemove(r)}
          >
            <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
          </Button>
        </div>
      </td>
    </tr>
  );
}
