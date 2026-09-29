"use client";

import { Button } from "@virzeen/ui";
import type { SizeGuideInput } from "@virzeen/validators";
import { Plus } from "lucide-react";
import { useRef } from "react";
import { useFormContext } from "react-hook-form";
import { itemButton, keepFocusOnPress, refocusAfterListChange } from "./form-focus";
import { ListError } from "./list-error";
import { MAX_SIZES, measurementName } from "./size-chart";
import { SizeChartRow } from "./size-chart-row";
import type { SizeChartState } from "./use-size-chart";

const headerClass = "px-3 py-2 text-left text-caption font-medium text-ink-muted uppercase";

/**
 * The chart's sizes: a table with one row per size, its name and a value (cm) for each measurement; 1 to 20 rows.
 * The column headers are the visible labels, so each input's name repeats them with the row ("Chest (cm), M"),
 * as in the stock grid (docs/ui/patterns.md §10). Scrolls sideways on narrow screens.
 */
export function SizeChartSizes({ chart }: { chart: SizeChartState }) {
  const form = useFormContext<SizeGuideInput>();
  const listError = form.formState.errors.chart?.rows?.message;
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const count = chart.rows.length;

  // The moved size keeps focus on the same arrow, or on the other one once that arrow is disabled.
  function move(index: number, to: number, action: "up" | "down") {
    chart.moveRow(index, to);
    refocusAfterListChange(
      () => itemButton(bodyRef.current, to, action),
      () => itemButton(bodyRef.current, to, action === "up" ? "down" : "up"),
    );
  }

  // Focus goes to the next size's Remove, else the previous one's, else "Add size".
  function remove(index: number) {
    chart.removeRow(index);
    refocusAfterListChange(
      () => itemButton(bodyRef.current, index, "remove"),
      () => itemButton(bodyRef.current, index - 1, "remove"),
      () => addRef.current,
    );
  }

  function add() {
    chart.addRow();
    requestAnimationFrame(() => bodyRef.current?.lastElementChild?.querySelector("input")?.focus());
  }

  return (
    <section aria-labelledby="sizes-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="sizes-heading" className="text-body font-medium">
          Sizes
        </h3>
        <p className="text-small text-ink-muted">
          {count} of {MAX_SIZES}
        </p>
      </div>
      <p className="-mt-2 text-small text-ink-muted">
        One row per size. Values in cm, like 96 or 96-101: customers can switch to inches. Leave a box blank
        if it doesn&apos;t apply.
      </p>
      {listError && <ListError>{listError}</ListError>}
      {count > 0 && (
        <div className="w-full overflow-x-auto rounded-md border border-line">
          <table className="w-full border-collapse text-small">
            <caption className="sr-only">Sizes, with each measurement in cm</caption>
            <thead className="bg-surface">
              <tr>
                <th scope="col" className={headerClass}>
                  Size
                </th>
                {chart.columns.map((column, c) => (
                  <th key={chart.columnKeys[c]} scope="col" className={headerClass}>
                    {measurementName(column, c)} (cm)
                  </th>
                ))}
                <th scope="col" className="px-3 py-2">
                  <span className="sr-only">Move or remove</span>
                </th>
              </tr>
            </thead>
            <tbody ref={bodyRef} className="divide-y divide-line">
              {chart.rowKeys.map((key, r) => (
                <SizeChartRow key={key} chart={chart} index={r} onMove={move} onRemove={remove} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button
        ref={addRef}
        variant="secondary"
        shape="pill"
        className="self-start"
        disabled={count >= MAX_SIZES}
        onMouseDown={keepFocusOnPress}
        onClick={add}
      >
        <Plus className="size-4" strokeWidth={1.5} aria-hidden />
        Add size
      </Button>
    </section>
  );
}
