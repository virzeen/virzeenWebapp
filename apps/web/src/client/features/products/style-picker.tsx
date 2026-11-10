"use client";

import { FormField, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { useProductSelection } from "./product-selection";
import { styleHasStock } from "./selection";

type StylePickerProps = {
  /** Styles with their own photos: each style's tile picture (specs/product-styles.md). */
  tiles?: Record<string, string | null>;
  /** On the right of the label: "Size guide" when the product has no sizes to put it beside. */
  labelAside?: React.ReactNode;
};

/**
 * The style picker (specs/product-page.md): square picture tiles when photos belong to styles, otherwise
 * "Colour: {name}" chips. A style with nothing in stock stays visible, crossed out, and can still be picked: its sizes
 * then offer "Notify me when it's back" (specs/notify-me.md).
 */
export function StylePicker({ tiles, labelAside }: StylePickerProps) {
  const { variants, colors, style, pickStyle } = useProductSelection();
  if (colors.length === 0) return null;

  return (
    <FormField label={`${tiles ? "Style" : "Colour"}${style ? `: ${style}` : ""}`} labelAside={labelAside}>
      <RadioGroup
        variant={tiles ? "swatch" : "card"}
        value={style ?? ""}
        onValueChange={pickStyle}
        className={tiles ? undefined : "grid-cols-2 sm:grid-cols-3"}
      >
        {colors.map((c) => (
          <RadioGroupItem
            key={c}
            value={c}
            label={c}
            unavailable={!styleHasStock(variants, c)}
            media={
              tiles ? <CloudImage src={tiles[c] ?? null} alt="" ratio="square" sizes="64px" /> : undefined
            }
          />
        ))}
      </RadioGroup>
    </FormField>
  );
}
