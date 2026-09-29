"use client";

import { FormField, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import { useId, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import type { SizeGuideView } from "./product-details-data";
import { readSizeUnit, toInches, writeSizeUnit, type SizeUnit } from "./size-units";

/**
 * The size guide popup's body: intro, the cm/in switch, the chart, "Fit tips" and "How to measure". The chart
 * scrolls sideways inside the popup on narrow phones. Only rendered while the popup is open, so reading the unit
 * from sessionStorage can't differ between the server and the browser.
 */
export function SizeGuideContent({ guide }: { guide: SizeGuideView }) {
  const [unit, setUnit] = useState<SizeUnit>(readSizeUnit);
  const captionId = useId();
  const show = (value: string) => (unit === "in" ? toInches(value) : value);

  return (
    <div className="flex flex-col gap-8 text-body text-ink">
      {guide.intro && <p className="whitespace-pre-line">{guide.intro}</p>}

      <div className="flex flex-col gap-4">
        <FormField label="Units">
          <RadioGroup
            variant="card"
            value={unit}
            onValueChange={(value) => {
              const next = value === "in" ? "in" : "cm";
              setUnit(next);
              writeSizeUnit(next);
            }}
            className="max-w-40 grid-cols-2"
          >
            <RadioGroupItem value="cm" label="cm" />
            <RadioGroupItem value="in" label="in" />
          </RadioGroup>
        </FormField>
        {/* Focusable, so keyboard users can scroll a chart wider than the screen. */}
        <div
          tabIndex={0}
          role="region"
          aria-labelledby={captionId}
          className="overflow-x-auto rounded-sm border border-line focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-solid"
        >
          <table className="w-full border-collapse text-small">
            <caption id={captionId} className="sr-only">
              {guide.name}, sizes in {unit === "in" ? "inches" : "centimetres"}
            </caption>
            <thead>
              <tr className="border-b border-line bg-surface">
                <th scope="col" className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  Size
                </th>
                {guide.chart.columns.map((column) => (
                  <th key={column} scope="col" className="px-3 py-2 text-left font-medium whitespace-nowrap">
                    {column} ({unit})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.chart.rows.map((row) => (
                <tr key={row.size} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-3 py-2 text-left font-medium whitespace-nowrap">
                    {row.size}
                  </th>
                  {guide.chart.columns.map((column, i) => (
                    <td key={column} className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {show(row.values[i] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {guide.fitTips && (
        <section className="flex flex-col gap-2">
          <h3 className="text-h3">Fit tips</h3>
          <p className="whitespace-pre-line text-ink-muted">{guide.fitTips}</p>
        </section>
      )}

      {(guide.howToMeasure.length > 0 || guide.imageUrl) && (
        <section className="flex flex-col gap-4">
          <h3 className="text-h3">How to measure</h3>
          {guide.howToMeasure.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-6 text-ink-muted">
              {guide.howToMeasure.map((tip, i) => (
                <li key={`${i}:${tip}`}>{tip}</li>
              ))}
            </ul>
          )}
          {guide.imageUrl && (
            <CloudImage
              src={guide.imageUrl}
              alt={guide.imageAlt?.trim() || "How to measure"}
              ratio="square"
              sizes="(min-width: 640px) 20rem, 100vw"
              className="w-full max-w-xs rounded-md"
              imageClassName="object-contain"
            />
          )}
        </section>
      )}
    </div>
  );
}
