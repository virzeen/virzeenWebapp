"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogFooter } from "@virzeen/ui";
import type { ProductInput } from "@virzeen/validators";
import { ImageIcon } from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { AddStyleField } from "./add-style-field";
import { ListError } from "./list-error";
import type { ImagesArray } from "./product-photos";
import { ProductStyleEditor } from "./product-style-editor";
import { sameValue, styleSummary } from "./variant-options";
import type { TableRow } from "./variant-table";

type ProductStyleListProps = {
  styles: string[];
  rowsOf: (style: string) => TableRow[];
  images: ImagesArray;
  perRowPrices: boolean;
  showSkus: boolean;
  productId: string | undefined;
  uploadsEnabled: boolean;
  onListChange: () => void;
  /** Each returns why the name can't be used, or null when it was done. */
  onAdd: (name: string) => string | null;
  onRename: (from: string, to: string) => string | null;
  onRemove: (style: string) => void;
  onRemoveRow: (index: number) => void;
};

/**
 * The styles as a short list: main photo, name, price, stock. A style's photos, price and stock are edited in a
 * popup that opens on Edit and straight after adding the style (specs/product-styles.md, the owner's choice).
 */
export function ProductStyleList({
  styles,
  rowsOf,
  images,
  perRowPrices,
  showSkus,
  productId,
  uploadsEnabled,
  onListChange,
  onAdd,
  onRename,
  onRemove,
  onRemoveRow,
}: ProductStyleListProps) {
  const form = useFormContext<ProductInput>();
  const [rows, photos] = useWatch({ control: form.control, name: ["variants", "images"] });
  const errors = form.formState.errors;
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // The style in the popup; kept while the popup fades out after closing.
  const [editing, setEditing] = useState<string | null>(null);
  // Where focus goes when the popup closes: Add style (opened from there, or the style was removed), else Edit.
  const backToAdd = useRef(false);

  function edit(style: string, fromAdd = false) {
    backToAdd.current = fromAdd;
    setEditing(style);
    setOpen(true);
  }

  function returnFocus(event: Event) {
    event.preventDefault();
    const list = listRef.current;
    const editButton =
      editing && !backToAdd.current
        ? list?.querySelector<HTMLElement>(`[data-style-edit="${CSS.escape(editing)}"]`)
        : null;
    (editButton ?? list?.querySelector<HTMLElement>("[data-add-style]"))?.focus();
  }

  const photosOf = (style: string) => photos.filter((image) => sameValue(image.color, style));
  const hasProblem = (style: string) =>
    rowsOf(style).some(({ index }) => errors.variants?.[index]) ||
    photos.some((image, index) => sameValue(image.color, style) && errors.images?.[index]);

  return (
    <div ref={listRef} className="flex flex-col gap-4">
      {styles.length > 0 && (
        <ul className="divide-y divide-line rounded-md border border-line">
          {styles.map((style) => {
            const summary = styleSummary(rows, style);
            const own = photosOf(style);
            const price =
              summary.minPaisa === null ? (
                "No price yet"
              ) : summary.maxPaisa !== null && summary.maxPaisa !== summary.minPaisa ? (
                <>
                  <Price paisa={summary.minPaisa} /> to <Price paisa={summary.maxPaisa} />
                </>
              ) : (
                <Price paisa={summary.minPaisa} />
              );
            const facts = [
              { key: "price", fact: price },
              { key: "stock", fact: summary.forSale ? `${summary.stock} in stock` : "Not for sale" },
              {
                key: "photos",
                fact:
                  own.length === 0
                    ? "No photos yet"
                    : `${own.length} ${own.length === 1 ? "photo" : "photos"}`,
              },
            ];
            return (
              <li key={style} className="flex items-center gap-4 p-3">
                <div className="relative w-14 shrink-0 overflow-hidden rounded-sm">
                  <CloudImage src={own[0]?.url ?? null} alt="" sizes="56px" />
                  {own.length === 0 && (
                    <ImageIcon
                      className="absolute inset-0 m-auto size-5 text-ink-muted"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-body font-medium">{style}</p>
                  <p className="text-small text-ink-muted">
                    {facts.map(({ key, fact }, i) => (
                      <Fragment key={key}>
                        {i > 0 && " · "}
                        {fact}
                      </Fragment>
                    ))}
                  </p>
                  {hasProblem(style) && <ListError>Something here needs fixing. Press Edit.</ListError>}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  shape="pill"
                  aria-haspopup="dialog"
                  data-style-edit={style}
                  onClick={() => edit(style)}
                >
                  Edit<span className="sr-only"> {style}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <AddStyleField
        first={styles.length === 0}
        onAdd={(name) => {
          const problem = onAdd(name);
          if (!problem) edit(name.trim(), true);
          return problem;
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        {editing !== null && (
          <DialogContent
            size="lg"
            title={editing}
            description="Its photos, price and stock. Save the product to show changes in the shop."
            footer={
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Done</Button>
                </DialogClose>
              </DialogFooter>
            }
            onCloseAutoFocus={returnFocus}
          >
            <ProductStyleEditor
              style={editing}
              rows={rowsOf(editing)}
              images={images}
              perRowPrices={perRowPrices}
              showSkus={showSkus}
              productId={productId}
              uploadsEnabled={uploadsEnabled}
              onListChange={onListChange}
              onRename={(to) => {
                const problem = onRename(editing, to);
                if (!problem) setEditing(to.trim());
                return problem;
              }}
              onRemove={() => {
                onRemove(editing);
                backToAdd.current = true;
                setOpen(false);
              }}
              onRemoveRow={onRemoveRow}
            />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
