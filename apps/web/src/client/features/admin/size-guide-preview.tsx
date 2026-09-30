"use client";

import type { SizeGuideFormValues } from "@virzeen/validators";
import { ImageIcon } from "lucide-react";
import { memo, useDeferredValue, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { SizeGuideView } from "@/client/features/products/product-details-data";
import { SizeGuideContent } from "@/client/features/products/size-guide-content";
import { toSizeGuideView } from "./size-guide-view";

const FIELDS = ["kind", "name", "intro", "chart", "fitTips", "howToMeasure", "imageUrl", "imageAlt"] as const;

/**
 * "What customers see" beside the size guide form (specs/product-page-v2.md "Size guides"): the Size guide popup's
 * title and content, built from the form as it's typed. Its cm/in switch works, but isn't remembered.
 */
export function SizeGuidePreview() {
  const form = useFormContext<SizeGuideFormValues>();
  // Typing stays quick: the popup is built again from the typed values a moment later, in the background. While
  // typing, the deferred values (and so the view) are the same as before, and the memo'd popup isn't drawn again.
  // (useWatch gives a new list only when a watched value changes.)
  const values = useDeferredValue(useWatch({ control: form.control, name: FIELDS }));
  const guide = useMemo(() => {
    const [kind, name, intro, chart, fitTips, howToMeasure, imageUrl, imageAlt] = values;
    return toSizeGuideView({ kind, name, intro, chart, fitTips, howToMeasure, imageUrl, imageAlt });
  }, [values]);

  return (
    <section aria-labelledby="preview-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="preview-heading" className="font-display text-h3">
          What customers see
        </h2>
        <p className="text-small text-ink-muted">The Size guide popup on the product page, as you type.</p>
      </div>
      <PreviewPopup guide={guide} />
    </section>
  );
}

/** The popup's title and content: drawn again only when the (deferred) guide changes. */
const PreviewPopup = memo(function PreviewPopup({ guide }: { guide: SizeGuideView }) {
  return (
    <div className="flex flex-col rounded-md border border-line bg-canvas">
      <div className="flex flex-col gap-1 border-b border-line p-4">
        <p className="font-display text-h3 text-ink">Size guide</p>
        <p className="text-body text-ink-muted">{guide.name || "Your guide's name"}</p>
      </div>
      <div className="p-4">
        <SizeGuideContent
          guide={guide}
          remember={false}
          picturePlaceholder={
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md bg-surface p-4 text-center text-small text-ink-muted">
              <ImageIcon className="size-6" strokeWidth={1.5} aria-hidden />
              Your size chart picture shows here.
            </div>
          }
        />
      </div>
    </div>
  );
});
