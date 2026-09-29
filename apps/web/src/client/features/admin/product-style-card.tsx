"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  FormField,
  Input,
} from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { useId, useState } from "react";
import { useFormContext, useWatch, type FieldArrayWithId } from "react-hook-form";
import { Price } from "@/client/components/shared/price";
import { ProductPhotos, type ImagesArray } from "./product-photos";
import { RupeesInput } from "./rupees-input";
import { VariantTable } from "./variant-table";

type ProductStyleCardProps = {
  style: string;
  /** This style's rows with their place in the whole `variants` list. */
  rows: { field: FieldArrayWithId<ProductInput, "variants", "fieldKey">; index: number }[];
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

/** One style (colour or design): its photos, price and size stock (specs/product-styles.md). */
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
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(style);
  const [renameError, setRenameError] = useState<string | null>(null);
  const first = rows[0]?.index ?? 0;
  const [price, shipping] = useWatch({
    control: form.control,
    name: [`variants.${first}.pricePaisa`, "shippingPaisa"],
  });
  const errors = form.formState.errors.variants;
  const priceError = rows.map(({ index }) => errors?.[index]?.pricePaisa?.message).find(Boolean);

  // One price for the style: every size row of it.
  function setPrice(paisa: number) {
    for (const { index } of rows) {
      form.setValue(`variants.${index}.pricePaisa`, paisa, {
        shouldDirty: true,
        shouldValidate: form.formState.isSubmitted,
      });
    }
  }

  function rename() {
    const problem = newName.trim() === style ? null : onRename(newName);
    setRenameError(problem);
    if (!problem) setRenaming(false);
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6 rounded-md border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="font-display text-h3">
          {style}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" shape="pill" onClick={() => setRenaming(true)}>
            Rename
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" shape="pill">
                Remove style
              </Button>
            </DialogTrigger>
            <DialogContent
              title={`Remove ${style}?`}
              description="Its photos go too. Saved sizes stay on the list, switched off, because past orders use them. Nothing changes in the shop until you save."
            >
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">Keep</Button>
                </DialogClose>
                <Button variant="destructive" onClick={onRemove}>
                  Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {renaming && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <FormField label="Style name" error={renameError ?? undefined} className="flex-1">
            <Input
              value={newName}
              maxLength={40}
              autoComplete="off"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  rename();
                }
                if (e.key === "Escape") setRenaming(false);
              }}
            />
          </FormField>
          <div className="flex gap-2 sm:pt-7">
            <Button size="sm" shape="pill" onClick={rename}>
              Save name
            </Button>
            <Button variant="ghost" size="sm" shape="pill" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ProductPhotos
        images={images}
        style={style}
        title="Photos"
        headingLevel={4}
        productId={productId}
        uploadsEnabled={uploadsEnabled}
        onListChange={onListChange}
      />

      {!perRowPrices && (
        <div className="flex flex-col gap-2">
          <FormField
            label="Price (Rs)"
            helper="Includes VAT"
            error={priceError}
            required
            className="sm:max-w-xs"
          >
            <RupeesInput
              value={price}
              onValueChange={setPrice}
              onBlur={() =>
                void form.trigger(rows.map(({ index }) => `variants.${index}.pricePaisa` as const))
              }
            />
          </FormField>
          {Number.isFinite(price) && (
            <p className="text-small text-ink-muted">
              Customers pay <Price paisa={price + (Number.isFinite(shipping) ? shipping : 0)} /> with free
              shipping.
            </p>
          )}
        </div>
      )}

      <VariantTable
        rows={rows}
        showPrices={perRowPrices}
        showSkus={showSkus}
        onListChange={onListChange}
        onRemove={onRemoveRow}
      />
    </section>
  );
}
