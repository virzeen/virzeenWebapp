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
import { useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Price } from "@/client/components/shared/price";
import { ProductPhotos, type ImagesArray } from "./product-photos";
import { RupeesInput } from "./rupees-input";
import { VariantTable, type TableRow } from "./variant-table";

type ProductStyleEditorProps = {
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
 * One style (colour or design) in its popup: Rename, Remove style, its photos, price and size stock
 * (specs/product-styles.md). The popup's title is the style's name.
 */
export function ProductStyleEditor({
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
}: ProductStyleEditorProps) {
  const form = useFormContext<ProductInput>();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(style);
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameButton = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
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

  // The name field closes and focus goes back to Rename.
  function closeRename() {
    setRenaming(false);
    requestAnimationFrame(() => renameButton.current?.focus());
  }

  function rename() {
    const problem = newName.trim() === style ? null : onRename(newName);
    setRenameError(problem);
    if (!problem) closeRename();
  }

  return (
    <div className="flex flex-col gap-6">
      {renaming ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <FormField label="Style name" error={renameError ?? undefined} className="flex-1">
            <Input
              ref={nameInput}
              value={newName}
              maxLength={40}
              autoComplete="off"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                rename();
              }}
            />
          </FormField>
          <div className="flex gap-2 sm:pt-7">
            <Button size="sm" shape="pill" onClick={rename}>
              Save name
            </Button>
            <Button variant="ghost" size="sm" shape="pill" onClick={closeRename}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="-mt-2 flex flex-wrap gap-1">
          <Button
            ref={renameButton}
            variant="ghost"
            size="sm"
            shape="pill"
            onClick={() => {
              setNewName(style);
              setRenameError(null);
              setRenaming(true);
              requestAnimationFrame(() => nameInput.current?.select());
            }}
          >
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
                <DialogClose asChild>
                  <Button variant="destructive" onClick={onRemove}>
                    Remove
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <ProductPhotos
        images={images}
        style={style}
        title="Photos"
        headingLevel={3}
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
    </div>
  );
}
