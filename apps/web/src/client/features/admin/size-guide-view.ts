import type { SizeGuideFormValues } from "@virzeen/validators";
import type { SizeGuideView } from "@/client/features/products/product-details-data";
import { measurementName } from "./size-chart";

const orNull = (text: string | undefined) => text?.trim() || null;

/**
 * The size guide form's values as the Size guide popup shows them ("What customers see", specs/product-page-v2.md),
 * while they are still being typed: a blank measurement reads "Measurement 2", every size gets a value per
 * measurement, and a Clothing guide keeps its table while an Accessories one shows only its picture.
 */
export function toSizeGuideView(values: SizeGuideFormValues): SizeGuideView {
  const kind = values.kind === "PICTURE" ? "PICTURE" : "CHART";
  const columns = values.chart.columns.map(measurementName);
  return {
    kind,
    name: values.name.trim(),
    intro: orNull(values.intro),
    chart:
      kind === "CHART"
        ? {
            columns,
            rows: values.chart.rows.map((row) => ({
              size: row.size.trim(),
              values: columns.map((_, c) => row.values[c]?.trim() ?? ""),
            })),
          }
        : null,
    fitTips: orNull(values.fitTips),
    howToMeasure: values.howToMeasure.map((tip) => tip.trim()).filter(Boolean),
    imageUrl: orNull(values.imageUrl),
    imageAlt: orNull(values.imageAlt),
  };
}
