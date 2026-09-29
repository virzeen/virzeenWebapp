"use client";

import { FormField, RadioGroup, RadioGroupItem } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { useProductSelection } from "./product-selection";
import { styleHasStock } from "./selection";

type StylePickerProps = {
  /** Styles with their own photos: each style's tile picture (specs/product-styles.md). */
  tiles?: Record<string, string | null>;
};

/**
 * The style picker (specs/product-page.md): square picture tiles when photos belong to styles, otherwise
 * "Colour: {name}" chips. A style with nothing in stock stays visible but can't be picked.
 */
export function StylePicker({ tiles }: StylePickerProps) {
  const { variants, colors, style, pickStyle } = useProductSelection();
  if (colors.length === 0) return null;

  return (
    <FormField label={`${tiles ? "Style" : "Colour"}${style ? `: ${style}` : ""}`}>
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
            disabled={!styleHasStock(variants, c)}
            media={
              tiles ? <CloudImage src={tiles[c] ?? null} alt="" ratio="square" sizes="64px" /> : undefined
            }
          />
        ))}
      </RadioGroup>
    </FormField>
  );
}
