"use client";

import { Button } from "@virzeen/ui";
import { useEffect, useRef } from "react";
import { refocusAfterListChange } from "../form-focus";
import { OptionChips } from "../option-chips";
import { useProductEditor } from "./editor-context";

const SIZE_PRESETS = [
  { label: "S, M, L, XL", values: ["S", "M", "L", "XL"] },
  { label: "Free size", values: ["Free size"] },
];

/**
 * The sizes pencil opens this above the size grid (specs/product-editor-on-page.md "Sizes"): the size chips with
 * add, remove and the presets. Each change makes or switches off rows for every style and saves at once
 * (useVariantOptions). Done or Escape closes it; the grid below shows the result as it changes.
 */
export function SizeChips({ onDone }: { onDone: () => void }) {
  const { variantOptions } = useProductEditor();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector("input")?.focus();
  }, []);

  // The pressed chip is gone: focus the next one's Remove, else the box to type in.
  function remove(size: string) {
    variantOptions.changeSizes([size], false);
    refocusAfterListChange(
      () => panelRef.current?.querySelector<HTMLElement>('[aria-label^="Remove size"]'),
      () => panelRef.current?.querySelector("input"),
    );
  }

  return (
    <div
      ref={panelRef}
      className="flex flex-col gap-3 rounded-md border border-line p-4"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onDone();
      }}
    >
      <OptionChips
        label="Sizes"
        itemName="size"
        values={variantOptions.options.sizes}
        maxLength={20}
        placeholder="e.g. M"
        presets={SIZE_PRESETS}
        onAdd={(values) => variantOptions.changeSizes(values, true)}
        onRemove={remove}
      />
      <Button variant="secondary" size="sm" shape="pill" className="self-start" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
