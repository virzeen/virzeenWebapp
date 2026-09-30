"use client";

import { Input, toast } from "@virzeen/ui";
import type { SizeGuideFormValues } from "@virzeen/validators";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { useId } from "react";
import { useFormContext } from "react-hook-form";
import { refocusAfterListChange } from "./form-focus";
import { MAX_MEASUREMENTS, MAX_SIZES, measurementName } from "./size-chart";
import { cellError, gridHeaderClass, gridHeaderStickyClass, type GridBoxProps } from "./size-chart-cells";
import { SizeChartMenu } from "./size-chart-menu";
import { isCellBlock, parseClipboardTable, type PasteResult } from "./size-chart-paste";
import type { ReplaceTableRequest } from "./size-chart-replace-dialog";
import { SizeChartRow } from "./size-chart-row";
import { isBlankChart } from "./size-chart-templates";
import type { SizeChartState } from "./use-size-chart";

const EXAMPLES = ["Chest", "Length", "Sleeve", "Waist", "Hip", "Inseam"];

const leftOut = (count: number) =>
  `The table holds up to ${MAX_SIZES} sizes and ${MAX_MEASUREMENTS} measurements, so ${count} pasted ${
    count === 1 ? "cell was" : "cells were"
  } left out.`;

type SizeChartGridProps = {
  chart: SizeChartState;
  gridRef: React.RefObject<HTMLTableElement | null>;
  /** Asks before a whole pasted table replaces a table with something typed in it. */
  askReplace: (request: ReplaceTableRequest) => void;
};

/**
 * The Clothing size table as one grid, like a spreadsheet (specs/product-page-v2.md "Size guides"): the header
 * cells are the measurement names, each with a menu (Move left, Move right, Remove); one row per size, each with its
 * menu (Move up, Move down, Remove). Enter goes down a column (Shift+Enter up), Tab across. Pasting cells copied from
 * Excel or Google Sheets fills the grid from that box; a whole copied table (headings and sizes) replaces it, after
 * asking when something is typed. The Size column stays in view when the grid scrolls sideways. Every box is named by
 * its column and row ("Chest (cm), M"), and its problem is linked to it.
 */
export function SizeChartGrid({ chart, gridRef, askReplace }: SizeChartGridProps) {
  const form = useFormContext<SizeGuideFormValues>();
  const columnErrors = form.formState.errors.chart?.columns;
  const idBase = useId();

  const boxAt = (row: number, col: number) =>
    gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${row}:${col}"]`);
  const menuAt = (menuId: string) =>
    gridRef.current?.querySelector<HTMLElement>(`[data-chart-menu="${menuId}"]`);

  function putPaste(result: PasteResult) {
    chart.applyPaste(result);
    if (result.dropped > 0) toast.message(leftOut(result.dropped));
  }

  function box(row: number, col: number): GridBoxProps {
    return {
      "data-cell": `${row}:${col}`,
      onKeyDown(event) {
        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
        // Enter in a box would send the form: here it moves down the column instead (Shift+Enter up).
        event.preventDefault();
        const next = boxAt(event.shiftKey ? row - 1 : row + 1, col);
        next?.focus();
        next?.select();
      },
      onPaste(event) {
        const block = parseClipboardTable(event.clipboardData.getData("text/plain"));
        if (!isCellBlock(block)) return; // One value: the box pastes it as usual.
        event.preventDefault();
        const result = chart.planPaste({ row, col }, block);
        if (!result.replaced) {
          putPaste(result);
          return;
        }
        // A whole table replaces every box, this one too: focus goes to the first measurement's name.
        const firstName = () => boxAt(-1, 1);
        if (isBlankChart({ columns: chart.columns, rows: chart.rows })) {
          putPaste(result);
          requestAnimationFrame(() => firstName()?.focus());
          return;
        }
        askReplace({
          title: "Replace the table with the one you pasted?",
          description: "What's in the table now is replaced by the pasted table.",
          replace: () => putPaste(result),
          focusAfterReplace: firstName,
          focusAfterKeep: () => boxAt(row, col),
        });
      },
    };
  }

  // Focus goes to the next measurement's menu, else the previous one's (Remove is off for the last one).
  function removeColumn(index: number) {
    chart.removeColumn(index);
    refocusAfterListChange(
      () => menuAt(`column:${index}`),
      () => menuAt(`column:${index - 1}`),
    );
  }

  function removeRow(index: number) {
    chart.removeRow(index);
    refocusAfterListChange(
      () => menuAt(`row:${index}`),
      () => menuAt(`row:${index - 1}`),
    );
  }

  return (
    <div className="w-fit max-w-full overflow-x-auto rounded-md border border-line">
      <table ref={gridRef} className="border-separate border-spacing-0 text-small">
        <caption className="sr-only">Size table: each size, with its measurements in cm</caption>
        <thead>
          <tr>
            <th scope="col" className={gridHeaderStickyClass}>
              <span className="flex h-11 items-center px-1 text-caption text-ink-muted uppercase">Size</span>
            </th>
            {chart.columns.map((column, c) => {
              const key = chart.columnKeys[c] ?? "";
              const name = measurementName(column, c);
              const error = cellError(`${idBase}-${key}`, columnErrors?.[c]?.message);
              return (
                <th key={key} scope="col" className={gridHeaderClass}>
                  <div className="flex items-start gap-1">
                    <div className="flex flex-col">
                      <Input
                        aria-label={`Measurement ${c + 1}`}
                        className="w-24"
                        maxLength={30}
                        autoComplete="off"
                        placeholder={`e.g. ${EXAMPLES[c] ?? "Chest"}`}
                        value={column}
                        onChange={(e) => chart.change(`chart.columns.${c}`, e.target.value)}
                        onBlur={() => chart.check(`chart.columns.${c}`)}
                        {...box(-1, c + 1)}
                        {...error.props}
                      />
                      {error.line}
                    </div>
                    <SizeChartMenu
                      label={`Move or remove ${name}`}
                      menuId={`column:${c}`}
                      actions={[
                        {
                          label: "Move left",
                          icon: ArrowLeft,
                          disabled: c === 0,
                          onSelect: () => chart.moveColumn(c, c - 1),
                        },
                        {
                          label: "Move right",
                          icon: ArrowRight,
                          disabled: c === chart.columns.length - 1,
                          onSelect: () => chart.moveColumn(c, c + 1),
                        },
                        {
                          label: "Remove",
                          icon: Trash2,
                          disabled: chart.columns.length === 1,
                          onSelect: () => removeColumn(c),
                        },
                      ]}
                    />
                  </div>
                </th>
              );
            })}
            <th scope="col" className={gridHeaderClass}>
              <span className="sr-only">Move or remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {chart.rowKeys.map((key, r) => (
            <SizeChartRow
              key={key}
              chart={chart}
              index={r}
              box={box}
              onMove={(from, to) => chart.moveRow(from, to)}
              onRemove={removeRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
