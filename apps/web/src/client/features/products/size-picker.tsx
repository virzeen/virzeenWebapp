"use client";

import { FormField, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import type { SizeGuideView } from "./product-details-data";
import { useProductSelection } from "./product-selection";
import { variantFor } from "./selection";
import { SizeGuideDialog } from "./size-guide-dialog";
import { sizeGridColumns } from "./size-grid";

type SizePickerProps = {
  ref: React.Ref<HTMLDivElement>;
  /** Add to bag was pressed before a size was picked. */
  error: boolean;
  onPick: () => void;
  sizeGuide: SizeGuideView | null;
};

/**
 * "Select size" with "Size guide" on the right (when the product has a guide), then a grid of size boxes as wide as the
 * longest size name needs, up to 5 in a row. Sizes sold out in the picked style stay visible, struck through and disabled.
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
        className={sizeGridColumns(sizes)}
      >
        {sizes.map((s) => {
          const variant = variantFor(variants, colors.length > 0, true, style, s);
          return (
            <RadioGroupItem
              key={s}
              value={s}
              label={s}
              disabled={!variant || variant.stock <= 0}
              // A name longer than its box wraps instead of running over the border.
              className="text-center wrap-anywhere"
            />
          );
        })}
      </RadioGroup>
    </FormField>
  );
}
