"use client";

import { Checkbox, FormField, Input } from "@virzeen/ui";
import { useFormState, useWatch } from "react-hook-form";
import { variantLabel } from "../variant-options";
import { useProductEditor } from "./editor-context";

/**
 * Settings → Prices and codes: "Different prices for some sizes" (the sizes then show a price box each) and "Edit SKU
 * codes" with one SKU box per row, saved when left. A SKU problem keeps the boxes open.
 */
export function SettingsRows() {
  const { form, variants, variantOptions, commit } = useProductEditor();
  const { perRowPrices, choosePerRowPrices, editSkus, setEditSkus } = variantOptions;
  const { errors } = useFormState({ control: form.control, name: "variants" });
  const rows = useWatch({ control: form.control, name: "variants" });
  const skuErrors = errors.variants;
  const hasSkuError = variants.fields.some((_, index) => skuErrors?.[index]?.sku);
  const showSkus = editSkus || hasSkuError;

  return (
    <section aria-labelledby="settings-rows-heading" className="flex flex-col gap-2">
      <h3 id="settings-rows-heading" className="text-body font-medium">
        Prices and codes
      </h3>
      <Checkbox
        label="Different prices for some sizes"
        description={
          perRowPrices
            ? "Each size has its own price on the page. Untick to use one price again (per style, if there are styles)."
            : "Tick to give each size its own price on the page."
        }
        checked={perRowPrices}
        onCheckedChange={(checked) => {
          choosePerRowPrices(checked === true);
          void commit();
        }}
      />
      <Checkbox
        label="Edit SKU codes"
        description="Stock codes are made when you save (VZ-PRODUCT-STYLE-SIZE). Tick to type your own."
        checked={showSkus}
        disabled={hasSkuError}
        onCheckedChange={(checked) => setEditSkus(checked === true)}
      />
      {showSkus && (
        <ul className="flex flex-col gap-4 pt-2">
          {variants.fields.map((field, index) => {
            const row = rows[index];
            if (!row) return null;
            return (
              <li key={field.fieldKey}>
                <FormField
                  label={`SKU, ${variantLabel(row)}${row.isActive ? "" : " (not for sale)"}`}
                  error={skuErrors?.[index]?.sku?.message}
                >
                  <Input
                    placeholder="Made on save"
                    autoComplete="off"
                    className="uppercase"
                    {...form.register(`variants.${index}.sku`, { onBlur: () => void commit() })}
                  />
                </FormField>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
