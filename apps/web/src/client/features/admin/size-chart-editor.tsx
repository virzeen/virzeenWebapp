"use client";

import { Button } from "@virzeen/ui";
import type { SizeGuideFormValues } from "@virzeen/validators";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { keepFocusOnPress } from "./form-focus";
import { ListError } from "./list-error";
import { MAX_MEASUREMENTS, MAX_SIZES } from "./size-chart";
import { SizeChartGrid } from "./size-chart-grid";
import { useReplaceTableDialog } from "./size-chart-replace-dialog";
import { SizeChartTemplateChoices, SizeChartTemplateDialog } from "./size-chart-template-picker";
import { isBlankChart, templateChart, type SizeChartTemplateId } from "./size-chart-templates";
import { useSizeChart } from "./use-size-chart";

/**
 * A Clothing guide's "Size table" (specs/product-page-v2.md "Size guides"): when it starts empty, the three templates
 * above the grid until one is picked or the guide is saved (they stay while typing, so the grid doesn't move under
 * the cursor; once something is typed, a template asks before replacing it); otherwise "Start from a template" (asks
 * before replacing). Under the grid, Add size and Add measurement with how many there are of the most allowed.
 */
export function SizeChartEditor() {
  const chart = useSizeChart();
  const form = useFormContext<SizeGuideFormValues>();
  const { errors, submitCount } = form.formState;
  const gridRef = useRef<HTMLTableElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const blank = isBlankChart({ columns: chart.columns, rows: chart.rows });
  // Decided once, when the table shows: typing doesn't hide the templates (or bring them back).
  const [offerTemplates, setOfferTemplates] = useState(blank);
  const showTemplates = offerTemplates && submitCount === 0;
  const replaceDialog = useReplaceTableDialog();
  const listErrors = [
    errors.chart?.message,
    errors.chart?.columns?.message,
    errors.chart?.rows?.message,
  ].filter((message): message is string => Boolean(message));

  const boxAt = (cell: string) => gridRef.current?.querySelector<HTMLInputElement>(`[data-cell="${cell}"]`);
  // A template's first box to fill: Chest for the first size; for Blank, the first measurement's name.
  const firstBox = (id: SizeChartTemplateId) => boxAt(id === "blank" ? "-1:1" : "0:1");

  function putTemplate(id: SizeChartTemplateId) {
    chart.replace(templateChart(id));
    setOfferTemplates(false);
  }

  // A template picked above the grid: straight in while the table is empty, else after asking.
  function pickFromPanel(id: SizeChartTemplateId) {
    if (blank) {
      putTemplate(id);
      requestAnimationFrame(() => firstBox(id)?.focus());
      return;
    }
    replaceDialog.ask({
      title: "Replace the table with a template?",
      description: "What's in the table now is replaced. The values are left blank for you to fill in.",
      replace: () => putTemplate(id),
      focusAfterReplace: () => firstBox(id),
      focusAfterKeep: () => panelRef.current?.querySelector<HTMLElement>(`[data-template="${id}"]`),
    });
  }

  function addRow() {
    chart.addRow();
    requestAnimationFrame(() => boxAt(`${chart.rows.length}:0`)?.focus());
  }

  function addColumn() {
    chart.addColumn();
    requestAnimationFrame(() => boxAt(`-1:${chart.columns.length + 1}`)?.focus());
  }

  return (
    <section aria-labelledby="table-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="table-heading" className="font-display text-h3">
          Size table
        </h2>
        {!showTemplates && (
          <SizeChartTemplateDialog replaces={!blank} onPick={putTemplate} focusAfterPick={firstBox} />
        )}
      </div>
      <p className="-mt-2 text-small text-ink-muted">
        One row per size, values in cm like 96 or 96-101: customers can switch to inches. Leave a box blank if
        it doesn&apos;t apply. Copied a table from Excel or Google Sheets? Paste it into a box.
      </p>
      {showTemplates && (
        <div
          ref={panelRef}
          className="flex flex-col gap-3 rounded-md border border-dashed border-line-strong p-4"
        >
          <h3 className="text-body font-medium">Start from a template</h3>
          <SizeChartTemplateChoices className="grid gap-4 sm:grid-cols-3" onPick={pickFromPanel} />
        </div>
      )}
      {listErrors.map((message) => (
        <ListError key={message}>{message}</ListError>
      ))}
      <SizeChartGrid chart={chart} gridRef={gridRef} askReplace={replaceDialog.ask} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          disabled={chart.rows.length >= MAX_SIZES}
          onMouseDown={keepFocusOnPress}
          onClick={addRow}
        >
          <Plus className="size-4" strokeWidth={1.5} aria-hidden />
          Add size
        </Button>
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          disabled={chart.columns.length >= MAX_MEASUREMENTS}
          onMouseDown={keepFocusOnPress}
          onClick={addColumn}
        >
          <Plus className="size-4" strokeWidth={1.5} aria-hidden />
          Add measurement
        </Button>
        <p className="text-small text-ink-muted">
          {chart.rows.length} of {MAX_SIZES} sizes · {chart.columns.length} of {MAX_MEASUREMENTS} measurements
        </p>
      </div>
      {replaceDialog.dialog}
    </section>
  );
}
