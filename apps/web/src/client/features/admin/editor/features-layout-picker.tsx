"use client";

import { cn, FormField, RadioGroup, RadioGroupItem, toast } from "@virzeen/ui";
import { FEATURE_LAYOUT_LABELS, FEATURE_LAYOUTS, type FeatureLayout } from "@virzeen/validators";
import { useWatch } from "react-hook-form";
import { useProductEditor } from "./editor-context";

/** Each layout drawn small: one box per picture (a name, and its place in the drawing), as on the page from md. */
const DRAWINGS: Record<FeatureLayout, { grid: string; boxes: [string, string][] }> = {
  THREE: {
    grid: "grid-cols-3",
    boxes: [
      ["a", ""],
      ["b", ""],
      ["c", ""],
    ],
  },
  THREE_TWO: {
    grid: "grid-cols-6 grid-rows-2",
    boxes: [
      ["a", "col-span-2"],
      ["b", "col-span-2"],
      ["c", "col-span-2"],
      ["d", "col-span-3"],
      ["e", "col-span-3"],
    ],
  },
  CUSTOM: {
    grid: "grid-cols-4 grid-rows-3",
    boxes: [
      ["wide", "col-span-4"],
      ["a", "col-span-2"],
      ["b", "col-span-2"],
      ["c", ""],
      ["d", ""],
      ["e", ""],
      ["f", ""],
    ],
  },
  TWO: {
    grid: "grid-cols-2",
    boxes: [
      ["a", ""],
      ["b", ""],
    ],
  },
  FULL: {
    grid: "grid-rows-2",
    boxes: [
      ["a", ""],
      ["b", ""],
    ],
  },
  TALL_LEFT: {
    grid: "grid-cols-2 grid-rows-2",
    boxes: [
      ["tall", "row-span-2"],
      ["a", ""],
      ["b", ""],
    ],
  },
  TALL_RIGHT: {
    grid: "grid-cols-2 grid-rows-2",
    boxes: [
      ["a", "col-start-1 row-start-1"],
      ["b", "col-start-1 row-start-2"],
      ["tall", "col-start-2 row-span-2 row-start-1"],
    ],
  },
  WIDE_TOP: {
    grid: "grid-cols-2 grid-rows-2",
    boxes: [
      ["wide", "col-span-2"],
      ["a", ""],
      ["b", ""],
    ],
  },
};

function LayoutDrawing({ layout }: { layout: FeatureLayout }) {
  const { grid, boxes } = DRAWINGS[layout];
  return (
    <span aria-hidden className={cn("grid h-12 w-16 gap-1", grid)}>
      {boxes.map(([box, place]) => (
        <span key={box} className={cn("rounded-sm bg-line-strong group-aria-checked:bg-canvas/70", place)} />
      ))}
    </span>
  );
}

/**
 * "Layout" above the features in the editor (specs/product-page-v2.md): eight choices, each a small drawing and its
 * name. Picking one saves at once. The editor shows the pictures in a simple grid; the layout shows in Preview and
 * the shop. With Custom picked, the rows editor goes under it (editor-features.tsx).
 */
export function FeaturesLayoutPicker() {
  const { form, commitField } = useProductEditor();
  const picked = useWatch({ control: form.control, name: "featureLayout" });
  const value = FEATURE_LAYOUTS.includes(picked) ? picked : "THREE";

  function pick(next: string) {
    const layout = FEATURE_LAYOUTS.find((candidate) => candidate === next);
    if (!layout || layout === value) return;
    const problem = commitField("featureLayout", layout);
    if (problem) toast.error(problem);
  }

  return (
    <FormField label="Layout" helper="See the layout in Preview.">
      <RadioGroup
        variant="card"
        value={value}
        onValueChange={pick}
        className="grid-cols-2 sm:grid-cols-4 xl:grid-cols-8"
      >
        {FEATURE_LAYOUTS.map((layout) => (
          <RadioGroupItem
            key={layout}
            value={layout}
            label={
              <span className="flex flex-col items-center gap-2 py-1">
                <LayoutDrawing layout={layout} />
                <span className="text-small">{FEATURE_LAYOUT_LABELS[layout]}</span>
              </span>
            }
          />
        ))}
      </RadioGroup>
    </FormField>
  );
}
