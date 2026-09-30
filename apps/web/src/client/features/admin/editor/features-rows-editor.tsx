"use client";

import { Button, FormField, RadioGroup, RadioGroupItem, toast } from "@virzeen/ui";
import {
  FEATURE_ROW_SHAPE_LABELS,
  FEATURE_ROW_SHAPES,
  MAX_FEATURE_ROWS,
  type FeatureRow,
} from "@virzeen/validators";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { refocusAfterListChange } from "../form-focus";
import { useProductEditor } from "./editor-context";
import { moveItem, removeAt } from "./features-cards";
import { addRow, changeRow, moveRow, removeRow, ROW_COUNTS, rowCountOf, rowsHoldLine } from "./features-rows";

let lastRowKey = 0;
/** A row's stable key: focus follows the row when it moves. */
const newRowKey = () => `feature-row-${++lastRowKey}`;

const ICON = { className: "size-5", strokeWidth: 1.5, "aria-hidden": true } as const;

/**
 * The Custom layout's rows, under the Layout picker while Custom is picked (specs/product-page-v2.md "Custom"): one
 * line per row, top to bottom, with how many pictures it holds (1 to 4), their shape (Landscape or Portrait), and
 * Move up, Move down and Remove, always shown; "+ Add row" (up to 9; a new row is 2 portrait); and a line with how
 * many pictures the rows hold against how many features there are. Every change saves at once.
 */
export function FeatureRowsEditor({ features }: { features: number }) {
  const { form, commitField } = useProductEditor();
  const watched = useWatch({ control: form.control, name: "featureRows" });
  const rows: FeatureRow[] = Array.isArray(watched) ? watched : [];
  const [keys, setKeys] = useState(() => rows.map(() => newRowKey()));
  // The rows changed length outside these handlers (a reload): fresh keys.
  if (keys.length !== rows.length) setKeys(rows.map(() => newRowKey()));
  const listRef = useRef<HTMLOListElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const focusNewRow = useRef<string | null>(null);
  const labelId = useId();

  const action = (key: string | undefined, name: string) =>
    key ? listRef.current?.querySelector<HTMLElement>(`[data-row="${key}"] [data-action="${name}"]`) : null;

  // A new row's picture count takes focus (the one picked, 2).
  useEffect(() => {
    const key = focusNewRow.current;
    if (!key) return;
    focusNewRow.current = null;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-row="${key}"] [role="radio"][aria-checked="true"]`)
      ?.focus();
  });

  function save(next: FeatureRow[], nextKeys: string[]) {
    const problem = commitField("featureRows", next);
    if (problem) {
      toast.error(problem);
      return false;
    }
    setKeys(nextKeys);
    return true;
  }

  function move(index: number, by: 1 | -1) {
    const key = keys[index];
    if (!save(moveRow(rows, index, by), moveItem(keys, index, index + by))) return;
    const [pressed, other] = by < 0 ? ["up", "down"] : ["down", "up"];
    refocusAfterListChange(
      () => action(key, pressed),
      () => action(key, other),
    );
  }

  function remove(index: number) {
    if (!save(removeRow(rows, index), removeAt(keys, index))) return;
    refocusAfterListChange(
      () => action(keys[index + 1], "remove"),
      () => action(keys[index - 1], "remove"),
      () => addRef.current,
    );
  }

  function add() {
    const next = addRow(rows);
    if (next.length === rows.length) return;
    const key = newRowKey();
    if (save(next, [...keys, key])) focusNewRow.current = key;
  }

  const full = rows.length >= MAX_FEATURE_ROWS;
  return (
    <div className="flex flex-col gap-4">
      <p id={labelId} className="text-small font-medium text-ink">
        Rows
      </p>
      {rows.length > 0 && (
        <ol ref={listRef} aria-labelledby={labelId} className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const key = keys[index] ?? `feature-row-at-${index}`;
            const n = index + 1;
            return (
              <li
                key={key}
                data-row={key}
                className="flex flex-wrap items-end gap-x-6 gap-y-4 rounded-md border border-line p-4"
              >
                <p className="w-full font-medium md:w-auto md:self-center">Row {n}</p>
                <FormField
                  label={
                    <>
                      Pictures<span className="sr-only"> in row {n}</span>
                    </>
                  }
                >
                  <RadioGroup
                    variant="card"
                    value={String(row.count)}
                    onValueChange={(value) => {
                      const count = rowCountOf(value);
                      if (count && count !== row.count) save(changeRow(rows, index, { count }), keys);
                    }}
                    className="grid-cols-4"
                  >
                    {ROW_COUNTS.map((count) => (
                      <RadioGroupItem
                        key={count}
                        value={String(count)}
                        label={String(count)}
                        className="min-w-11"
                      />
                    ))}
                  </RadioGroup>
                </FormField>
                <FormField
                  label={
                    <>
                      Shape<span className="sr-only"> of row {n}</span>
                    </>
                  }
                >
                  <RadioGroup
                    variant="card"
                    value={row.shape}
                    onValueChange={(value) => {
                      const shape = FEATURE_ROW_SHAPES.find((candidate) => candidate === value);
                      if (shape && shape !== row.shape) save(changeRow(rows, index, { shape }), keys);
                    }}
                    className="grid-cols-2"
                  >
                    {FEATURE_ROW_SHAPES.map((shape) => (
                      <RadioGroupItem key={shape} value={shape} label={FEATURE_ROW_SHAPE_LABELS[shape]} />
                    ))}
                  </RadioGroup>
                </FormField>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    shape="pill"
                    aria-label={`Move row ${n} up`}
                    data-action="up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp {...ICON} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    shape="pill"
                    aria-label={`Move row ${n} down`}
                    data-action="down"
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown {...ICON} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    shape="pill"
                    aria-label={`Remove row ${n}`}
                    data-action="remove"
                    onClick={() => remove(index)}
                  >
                    <Trash2 {...ICON} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button ref={addRef} variant="secondary" size="sm" shape="pill" disabled={full} onClick={add}>
          <Plus className="size-4" strokeWidth={1.5} aria-hidden />
          Add row
        </Button>
        {full && <p className="text-small text-ink-muted">Add up to {MAX_FEATURE_ROWS} rows.</p>}
      </div>
      <p aria-live="polite" className="text-small text-ink-muted">
        {rowsHoldLine(rows, features)}
      </p>
    </div>
  );
}
