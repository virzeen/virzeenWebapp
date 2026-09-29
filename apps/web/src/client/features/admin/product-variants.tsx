"use client";

import { Checkbox, FormField, Input } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Price } from "@/client/components/shared/price";
import { AddStyleField } from "./add-style-field";
import { ListError } from "./list-error";
import { OptionChips } from "./option-chips";
import type { ImagesArray } from "./product-photos";
import { ProductStyleCard } from "./product-style-card";
import { RupeesInput } from "./rupees-input";
import { useVariantOptions } from "./use-variant-options";
import { sameValue, type VariantRow } from "./variant-options";
import { VariantTable } from "./variant-table";

type ProductVariantsProps = {
  /** The rows the form started with, or was reloaded with after a save (`savedAt` changes then). */
  initialRows: readonly VariantRow[];
  savedAt: string | undefined;
  images: ImagesArray;
  productId: string | undefined;
  uploadsEnabled: boolean;
  onListChange: () => void;
};

const SIZE_PRESETS = [
  { label: "S, M, L, XL", values: ["S", "M", "L", "XL"] },
  { label: "Free size", values: ["Free size"] },
];

/**
 * Price, shipping, sizes and styles with their stock (specs/admin-product-editor.md, specs/product-styles.md).
 * Without styles: one price and one stock table. With styles: an inline card per style with its photos, price and
 * stock. Shipping is one value for the whole product, entered once at the top.
 */
export function ProductVariants({
  initialRows,
  savedAt,
  images,
  productId,
  uploadsEnabled,
  onListChange,
}: ProductVariantsProps) {
  const form = useFormContext<ProductInput>();
  const o = useVariantOptions({ initialRows, savedAt, images, onListChange });
  const [firstPrice, shipping] = useWatch({
    control: form.control,
    name: ["variants.0.pricePaisa", "shippingPaisa"],
  });
  const errors = form.formState.errors.variants;
  const listError = errors?.root?.message ?? errors?.message;
  const hasSkuError = o.variants.fields.some((_, i) => errors?.[i]?.sku);
  const showSkus = o.editSkus || hasSkuError;
  const styles = o.options.colors;
  const rows = o.variants.fields.map((field, index) => ({ field, index }));
  const rowsOf = (style: string) => rows.filter(({ field }) => sameValue(field.color, style));
  // Rows whose style isn't in the list any more (saved and switched off): still shown so they can come back.
  const leftovers =
    styles.length > 0
      ? rows.filter(({ field }) => !styles.some((style) => sameValue(field.color, style)))
      : [];
  const simple =
    styles.length === 0 &&
    o.options.sizes.length === 0 &&
    rows.length === 1 &&
    rows[0]?.field.isActive === true;
  const removeRow = (index: number) => {
    o.variants.remove(index);
    onListChange();
  };

  return (
    <section aria-labelledby="price-heading" className="flex flex-col gap-6">
      <h2 id="price-heading" className="font-display text-h3">
        Price and stock
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {styles.length === 0 && !o.perRowPrices && (
          <FormField
            label="Price (Rs)"
            helper="Includes VAT"
            error={rows.map(({ index }) => errors?.[index]?.pricePaisa?.message).find(Boolean)}
            required
          >
            <RupeesInput
              value={firstPrice}
              onValueChange={o.setAllPrices}
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
      {styles.length === 0 && !o.perRowPrices && Number.isFinite(firstPrice) && (
        <p className="-mt-2 text-small text-ink-muted">
          Customers pay <Price paisa={firstPrice + (Number.isFinite(shipping) ? shipping : 0)} /> with free
          shipping.
        </p>
      )}
      <Checkbox
        label="Different prices for some sizes"
        description={
          o.perRowPrices ? "Untick to use one price again (per style, if there are styles)." : undefined
        }
        checked={o.perRowPrices}
        onCheckedChange={(checked) => o.choosePerRowPrices(checked === true)}
      />
      <OptionChips
        label="Sizes"
        itemName="size"
        values={o.options.sizes}
        maxLength={20}
        placeholder="e.g. M"
        presets={SIZE_PRESETS}
        onAdd={(values) => o.changeSizes(values, true)}
        onRemove={(value) => o.changeSizes([value], false)}
      />
      {listError && <ListError>{listError}</ListError>}

      {styles.length === 0 &&
        (simple ? (
          <FormField
            label="Stock"
            helper="How many you have. Add sizes or styles to count each one."
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
          <VariantTable
            rows={rows}
            showPrices={o.perRowPrices}
            showSkus={showSkus}
            onListChange={onListChange}
            onRemove={removeRow}
          />
        ))}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-body font-medium">Styles</p>
          <p className="text-small text-ink-muted">
            Colours or designs shown on one product page, like Nike&apos;s colourways. Each style has its own
            photos, price and stock; customers switch between them with picture swatches.
          </p>
        </div>
        {styles.map((style) => (
          <ProductStyleCard
            key={style}
            style={style}
            rows={rowsOf(style)}
            images={images}
            perRowPrices={o.perRowPrices}
            showSkus={showSkus}
            productId={productId}
            uploadsEnabled={uploadsEnabled}
            onListChange={onListChange}
            onRename={(to) => o.renameStyle(style, to)}
            onRemove={() => o.removeStyle(style)}
            onRemoveRow={removeRow}
          />
        ))}
        {leftovers.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-small font-medium">Earlier styles and sizes (not for sale)</p>
            <VariantTable
              rows={leftovers}
              showPrices={o.perRowPrices}
              showSkus={showSkus}
              onListChange={onListChange}
              onRemove={removeRow}
            />
          </div>
        )}
        <AddStyleField first={styles.length === 0} onAdd={o.addStyle} />
      </div>

      {rows.some(({ field }) => field.id) && !simple && (
        <p className="text-small text-ink-muted">
          Saved rows can&apos;t be deleted because past orders use them. Untick For sale to stop selling one.
        </p>
      )}
      <Checkbox
        label="Edit SKU codes"
        description="Stock codes are made when you save (VZ-PRODUCT-STYLE-SIZE). Tick to type your own."
        checked={showSkus}
        disabled={hasSkuError}
        onCheckedChange={(checked) => o.setEditSkus(checked === true)}
      />
      {simple && showSkus && (
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
