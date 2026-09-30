"use client";

import { cn, FormField, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import type { SizeChart } from "@virzeen/validators";
import { useId, useState } from "react";
import { readSizeUnit, toInches, writeSizeUnit, type SizeUnit } from "./size-units";

type SizeGuideTableProps = {
  /** The guide's name, for the table's caption. */
  name: string;
  chart: SizeChart;
  /** Remember the unit for the visit (the shop's popup); the admin preview starts in cm and forgets it. */
  remember: boolean;
};

const headClass = "border-b border-line bg-surface px-4 py-3 text-left font-medium whitespace-nowrap";
const cellClass = "border-b border-line px-4 py-3 whitespace-nowrap tabular-nums group-last:border-b-0";

/**
 * A Clothing guide's table in the Size guide popup (specs/product-page-v2.md "Size guides"): the "Units" switch
 * (cm | in) at the top right, then the table with the Size column pinned while it scrolls sideways, a line under each
 * row, and the row under the pointer (or tapped) tinted. Only rendered while the popup is open (or in the admin
 * preview, which doesn't read the stored unit), so reading sessionStorage can't differ between server and browser.
 */
export function SizeGuideTable({ name, chart, remember }: SizeGuideTableProps) {
  const [unit, setUnit] = useState<SizeUnit>(() => (remember ? readSizeUnit() : "cm"));
  const captionId = useId();
  const show = (value: string) => (unit === "in" ? toInches(value) : value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <FormField label="Units" className="flex-row items-center gap-3">
          <RadioGroup
            variant="segmented"
            value={unit}
            onValueChange={(value) => {
              const next = value === "in" ? "in" : "cm";
              setUnit(next);
              if (remember) writeSizeUnit(next);
            }}
          >
            <RadioGroupItem value="cm" label="cm" />
            <RadioGroupItem value="in" label="in" />
          </RadioGroup>
        </FormField>
      </div>
      {/* Focusable, so keyboard users can scroll a table wider than the screen. */}
      <div
        tabIndex={0}
        role="region"
        aria-labelledby={captionId}
        className="overflow-x-auto rounded-md border border-line focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-solid"
      >
        <table className="w-full border-separate border-spacing-0 text-small">
          <caption id={captionId} className="sr-only">
            {name.trim() ? `${name.trim()}, sizes` : "Sizes"} in {unit === "in" ? "inches" : "centimetres"}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={cn("sticky left-0 border-r", headClass)}>
                Size
              </th>
              {chart.columns.map((column, c) => (
                <th key={`${c}:${column}`} scope="col" className={headClass}>
                  {column} ({unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, r) => (
              // Tapping a row tints it, to follow it across on a phone (the pointer does the same with hover).
              <tr
                key={`${r}:${row.size}`}
                tabIndex={-1}
                className="group outline-none hover:bg-surface focus:bg-surface"
              >
                <th
                  scope="row"
                  className="sticky left-0 border-r border-b border-line bg-canvas px-4 py-3 text-left font-medium whitespace-nowrap group-last:border-b-0 group-hover:bg-surface group-focus:bg-surface"
                >
                  {row.size}
                </th>
                {chart.columns.map((column, c) => (
                  <td key={`${c}:${column}`} className={cellClass}>
                    {show(row.values[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
