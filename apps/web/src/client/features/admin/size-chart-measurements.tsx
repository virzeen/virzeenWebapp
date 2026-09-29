"use client";

import { Button, FormField, Input } from "@virzeen/ui";
import type { SizeGuideInput } from "@virzeen/validators";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useFormContext } from "react-hook-form";
import { itemButton, keepFocusOnPress, refocusAfterListChange } from "./form-focus";
import { ListError } from "./list-error";
import { MAX_MEASUREMENTS } from "./size-chart";
import type { SizeChartState } from "./use-size-chart";

/** The chart's measurements (its columns, left to right): name, move up or down, remove; 1 to 6. */
export function SizeChartMeasurements({ chart }: { chart: SizeChartState }) {
  const form = useFormContext<SizeGuideInput>();
  const errors = form.formState.errors.chart?.columns;
  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const count = chart.columns.length;

  // The moved measurement keeps focus on the same arrow, or on the other one once that arrow is disabled.
  function move(index: number, to: number, action: "up" | "down") {
    chart.moveColumn(index, to);
    refocusAfterListChange(
      () => itemButton(listRef.current, to, action),
      () => itemButton(listRef.current, to, action === "up" ? "down" : "up"),
    );
  }

  // Focus goes to the next measurement's Remove, else the previous one's, else "Add measurement".
  function remove(index: number) {
    chart.removeColumn(index);
    refocusAfterListChange(
      () => itemButton(listRef.current, index, "remove"),
      () => itemButton(listRef.current, index - 1, "remove"),
      () => addRef.current,
    );
  }

  function add() {
    chart.addColumn();
    requestAnimationFrame(() => listRef.current?.lastElementChild?.querySelector("input")?.focus());
  }

  return (
    <section aria-labelledby="measurements-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="measurements-heading" className="text-body font-medium">
          Measurements
        </h3>
        <p className="text-small text-ink-muted">
          {count} of {MAX_MEASUREMENTS}
        </p>
      </div>
      <p className="-mt-2 text-small text-ink-muted">
        What you measure, e.g. Chest, Length, Sleeve. Each one is a column of the chart, in this order.
      </p>
      {errors?.message && <ListError>{errors.message}</ListError>}
      <ol ref={listRef} className="flex flex-col gap-3">
        {chart.columns.map((column, index) => {
          const name = column.trim() || `measurement ${index + 1}`;
          return (
            <li key={chart.columnKeys[index]} className="flex items-start gap-1">
              <FormField
                label={`Measurement ${index + 1}`}
                error={errors?.[index]?.message}
                className="min-w-0 flex-1"
              >
                <Input
                  value={column}
                  maxLength={30}
                  autoComplete="off"
                  placeholder={index === 0 ? "e.g. Chest" : undefined}
                  onChange={(e) => chart.change(`chart.columns.${index}`, e.target.value)}
                  onBlur={() => chart.check(`chart.columns.${index}`)}
                />
              </FormField>
              <div className="flex pt-7">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${name} up`}
                  data-action="up"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1, "up")}
                >
                  <ArrowUp className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${name} down`}
                  data-action="down"
                  disabled={index === count - 1}
                  onClick={() => move(index, index + 1, "down")}
                >
                  <ArrowDown className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${name}`}
                  data-action="remove"
                  disabled={count === 1}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <Button
        ref={addRef}
        variant="secondary"
        shape="pill"
        className="self-start"
        disabled={count >= MAX_MEASUREMENTS}
        onMouseDown={keepFocusOnPress}
        onClick={add}
      >
        <Plus className="size-4" strokeWidth={1.5} aria-hidden />
        Add measurement
      </Button>
    </section>
  );
}
