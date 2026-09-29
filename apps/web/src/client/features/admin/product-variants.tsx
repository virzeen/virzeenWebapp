"use client";

import { Checkbox, FormField, Input } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { useState } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Price } from "@/client/components/shared/price";
import { ListError } from "./list-error";
import { OptionChips } from "./option-chips";
import { RupeesInput } from "./rupees-input";
import {
  addOption,
  optionsFromRows,
  pricesDiffer,
  removeOption,
  sortRows,
  type OptionKind,
  type Options,
  type VariantRow,
} from "./variant-options";
import { VariantTable } from "./variant-table";

type ProductVariantsProps = {
  /** The rows the form started with, or was reloaded with after a save (`savedAt` changes then). */
  initialRows: readonly VariantRow[];
  savedAt: string | undefined;
  onListChange: () => void;
};

const SIZE_PRESETS = [
  { label: "S, M, L, XL", values: ["S", "M", "L", "XL"] },
  { label: "Free size", values: ["Free size"] },
];

/** Price, shipping, sizes × colours and stock (specs/admin-product-editor.md). */
export function ProductVariants({ initialRows, savedAt, onListChange }: ProductVariantsProps) {
  const form = useFormContext<ProductInput>();
  const variants = useFieldArray({ control: form.control, name: "variants", keyName: "fieldKey" });
  const [options, setOptions] = useState<Options>(() => optionsFromRows(initialRows));
  const [perRowPrices, setPerRowPrices] = useState(() => pricesDiffer(initialRows));
  const [editSkus, setEditSkus] = useState(false);
  // After a save the form reloads the saved rows; the size and colour lists follow them. The ticked boxes stay.
  const [loadedAt, setLoadedAt] = useState(savedAt);
  if (savedAt !== loadedAt) {
    setLoadedAt(savedAt);
    setOptions(optionsFromRows(initialRows));
    if (pricesDiffer(initialRows)) setPerRowPrices(true);
  }
  const [firstPrice, shipping] = useWatch({
    control: form.control,
    name: ["variants.0.pricePaisa", "shippingPaisa"],
  });
  const errors = form.formState.errors.variants;
  const listError = errors?.root?.message ?? errors?.message;
  const firstPriceError = variants.fields.map((_, i) => errors?.[i]?.pricePaisa?.message).find(Boolean);
  const hasSkuError = variants.fields.some((_, i) => errors?.[i]?.sku);
  const simple =
    options.sizes.length === 0 &&
    options.colors.length === 0 &&
    variants.fields.length === 1 &&
    variants.fields[0]?.isActive === true;

  const setAllPrices = (paisa: number) => {
    const rows = form.getValues("variants");
    rows.forEach((_, index) =>
      form.setValue(`variants.${index}.pricePaisa`, paisa, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      }),
    );
  };

  function change(kind: OptionKind, values: string[], add: boolean) {
    let rows = form.getValues("variants");
    let next = options;
    const price = form.getValues("variants.0.pricePaisa");
    const newRow = (size: string, color: string): VariantRow => ({
      sku: "",
      size,
      color,
      pricePaisa: price,
      stock: 0,
      isActive: true,
    });
    for (const value of values) {
      rows = add ? addOption(rows, kind, value, next, newRow) : removeOption(rows, kind, value, next);
      const list = kind === "size" ? next.sizes : next.colors;
      const updated = add ? [...list, value] : list.filter((known) => known !== value);
      next = kind === "size" ? { ...next, sizes: updated } : { ...next, colors: updated };
    }
    setOptions(next);
    variants.replace(sortRows(rows, next));
    onListChange();
  }

  return (
    <section aria-labelledby="price-heading" className="flex flex-col gap-6">
      <h2 id="price-heading" className="font-display text-h3">
        Price and stock
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {!perRowPrices && (
          <FormField label="Price (Rs)" helper="Includes VAT" error={firstPriceError} required>
            <RupeesInput
              value={firstPrice}
              onValueChange={setAllPrices}
              onBlur={() => void form.trigger("variants.0.pricePaisa")}
            />
          </FormField>
        )}
        <FormField
          label="Shipping (Rs)"
          helper="Added to the price. Customers see one price with free shipping. 0 for none."
          error={form.formState.errors.shippingPaisa?.message}
          required
        >
          <Controller
            control={form.control}
            name="shippingPaisa"
            render={({ field }) => (
              <RupeesInput value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        </FormField>
      </div>
      {!perRowPrices && Number.isFinite(firstPrice) && (
        <p className="-mt-2 text-small text-ink-muted">
          Customers pay <Price paisa={firstPrice + (Number.isFinite(shipping) ? shipping : 0)} /> with free
          shipping.
        </p>
      )}
      <Checkbox
        label="Different prices for some sizes or colours"
        description={perRowPrices ? "Untick to use the first row's price for all." : undefined}
        checked={perRowPrices}
        onCheckedChange={(checked) => {
          if (checked !== true) setAllPrices(form.getValues("variants.0.pricePaisa"));
          setPerRowPrices(checked === true);
        }}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <OptionChips
          label="Sizes"
          itemName="size"
          values={options.sizes}
          maxLength={20}
          placeholder="e.g. M"
          presets={SIZE_PRESETS}
          onAdd={(values) => change("size", values, true)}
          onRemove={(value) => change("size", [value], false)}
        />
        <OptionChips
          label="Colours"
          itemName="colour"
          values={options.colors}
          maxLength={40}
          placeholder="e.g. Black"
          onAdd={(values) => change("color", values, true)}
          onRemove={(value) => change("color", [value], false)}
        />
      </div>

      {listError && <ListError>{listError}</ListError>}
      {simple ? (
        <FormField
          label="Stock"
          helper="How many you have. Add sizes or colours above to count each one."
          error={errors?.[0]?.stock?.message}
          required
          className="sm:max-w-xs"
        >
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            {...form.register("variants.0.stock", { valueAsNumber: true })}
          />
        </FormField>
      ) : (
        <div className="flex flex-col gap-2">
          <VariantTable
            fields={variants.fields}
            showPrices={perRowPrices}
            showSkus={editSkus || hasSkuError}
            onListChange={onListChange}
            onRemove={(index) => {
              variants.remove(index);
              onListChange();
            }}
          />
          {variants.fields.some((field) => field.id) && (
            <p className="text-small text-ink-muted">
              Saved rows can&apos;t be deleted because past orders use them. Untick For sale to stop selling
              one.
            </p>
          )}
        </div>
      )}
      <Checkbox
        label="Edit SKU codes"
        description="Stock codes are made when you save (VZ-PRODUCT-COLOUR-SIZE). Tick to type your own."
        checked={editSkus || hasSkuError}
        disabled={hasSkuError}
        onCheckedChange={(checked) => setEditSkus(checked === true)}
      />
      {simple && (editSkus || hasSkuError) && (
        <FormField label="SKU" error={errors?.[0]?.sku?.message} className="sm:max-w-sm">
          <Input
            placeholder="Made on save"
            autoComplete="off"
            className="uppercase"
            {...form.register("variants.0.sku", { onChange: onListChange })}
          />
        </FormField>
      )}
    </section>
  );
}
