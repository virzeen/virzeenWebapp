"use client";

import { FormField, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import type { SizeGuideView } from "./product-details-data";
import { useProductSelection } from "./product-selection";
import { variantFor } from "./selection";
import { SizeGuideDialog } from "./size-guide-dialog";

type SizePickerProps = {
  ref: React.Ref<HTMLDivElement>;
  /** Add to bag was pressed before a size was picked. */
  error: boolean;
  onPick: () => void;
  sizeGuide: SizeGuideView | null;
};

/**
 * "Select size" with "Size guide" on the right (when the product has a guide), then a grid of size boxes, up to 5 in
 * a row. Sizes sold out in the picked style stay visible, struck through and disabled.
 */
export function SizePicker({ ref, error, onPick, sizeGuide }: SizePickerProps) {
  const { variants, colors, sizes, style, size, pickSize } = useProductSelection();
  if (sizes.length === 0) return null;

  return (
    <FormField
      label="Select size"
      error={error ? "Select a size" : undefined}
      labelAside={sizeGuide ? <SizeGuideDialog guide={sizeGuide} /> : undefined}
    >
      <RadioGroup
        ref={ref}
        variant="card"
        value={size ?? ""}
        onValueChange={(value) => {
          pickSize(value);
          onPick();
        }}
        // Boxes at least 4.5rem wide, and never more than 5 in a row.
        className="grid-cols-[repeat(auto-fill,minmax(max(4.5rem,calc((100%_-_2rem)/5)),1fr))]"
      >
        {sizes.map((s) => {
          const variant = variantFor(variants, colors.length > 0, true, style, s);
          return <RadioGroupItem key={s} value={s} label={s} disabled={!variant || variant.stock <= 0} />;
        })}
      </RadioGroup>
    </FormField>
  );
}
