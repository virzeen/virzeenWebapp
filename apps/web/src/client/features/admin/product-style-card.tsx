"use client";

import { FormField } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { useId } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Price } from "@/client/components/shared/price";
import { ProductPhotos, type ImagesArray } from "./product-photos";
import { RupeesInput } from "./rupees-input";
import { StyleCardHeader } from "./style-card-header";
import { VariantTable, type TableRow } from "./variant-table";

type ProductStyleCardProps = {
  style: string;
  /** This style's rows with their place in the whole `variants` list. */
  rows: TableRow[];
  images: ImagesArray;
  perRowPrices: boolean;
  showSkus: boolean;
  productId: string | undefined;
  uploadsEnabled: boolean;
  onListChange: () => void;
  /** Returns why the name can't be used, or null when the style was renamed. */
  onRename: (to: string) => string | null;
  onRemove: () => void;
  onRemoveRow: (index: number) => void;
};

/**
 * One style (colour or design) inline in Price and stock (specs/product-styles.md): a region named by its h3.
 * From a card width of 36rem (container query, so it follows the editor column, not the screen), two columns:
 * its photos on the left, its price, the product's shipping and its size stock on the right. One column below
 * that, photos first.
 */
export function ProductStyleCard({
  style,
  rows,
  images,
  perRowPrices,
  showSkus,
  productId,
  uploadsEnabled,
  onListChange,
  onRename,
  onRemove,
  onRemoveRow,
}: ProductStyleCardProps) {
  const form = useFormContext<ProductInput>();
  const headingId = useId();
  const first = rows[0]?.index ?? 0;
  const [price, shipping] = useWatch({
    control: form.control,
    name: [`variants.${first}.pricePaisa`, "shippingPaisa"],
  });
  const errors = form.formState.errors.variants;
  const priceError = rows.map(({ index }) => errors?.[index]?.pricePaisa?.message).find(Boolean);
  const hasShipping = Number.isFinite(shipping);
  const showTotal = !perRowPrices && Number.isFinite(price);

  // One price for the style: every size row of it.
  function setPrice(paisa: number) {
    for (const { index } of rows) {
      form.setValue(`variants.${index}.pricePaisa`, paisa, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      });
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className="@container flex flex-col gap-4 rounded-md border border-line p-4"
    >
      <StyleCardHeader headingId={headingId} style={style} onRename={onRename} onRemove={onRemove} />

      <div className="grid gap-6 @xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="max-w-sm min-w-0 @xl:max-w-none">
          <ProductPhotos
            images={images}
            style={style}
            title="Photos"
            headingLevel={4}
            layout="stacked"
            productId={productId}
            uploadsEnabled={uploadsEnabled}
            onListChange={onListChange}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {!perRowPrices && (
            <FormField label="Price (Rs)" helper="Includes VAT" error={priceError} required>
              <RupeesInput
                value={price}
                onValueChange={setPrice}
                onBlur={() =>
                  void form.trigger(rows.map(({ index }) => `variants.${index}.pricePaisa` as const))
                }
              />
            </FormField>
          )}
          {(hasShipping || showTotal) && (
            <p className="text-small text-ink-muted">
              {hasShipping && (
                <>
                  Shipping <Price paisa={shipping} />, the same for every style.{" "}
                </>
              )}
              {showTotal && (
                <>
                  Customers pay <Price paisa={price + (hasShipping ? shipping : 0)} /> with free shipping.
                </>
              )}
            </p>
          )}
          <VariantTable
            rows={rows}
            showPrices={perRowPrices}
            showSkus={showSkus}
            onListChange={onListChange}
            onRemove={onRemoveRow}
          />
        </div>
      </div>
    </section>
  );
}
