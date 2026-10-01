"use client";

import {
  Button,
  ButtonLink,
  Dialog,
  DialogContent,
  DialogTrigger,
  RadioGroup,
  RadioGroupItem,
} from "@virzeen/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useRef, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { sizeGridColumns } from "@/client/features/products/size-grid";
import type { FavouriteView } from "@/server/actions/favourites";
import { favouriteDetails, favouriteHref, type BagChoice } from "./favourite-bag";
import { BagPillLabel } from "./bag-pill-label";
import { useAddToBag } from "./use-add-to-bag";

type AddToBagDialogProps = {
  item: FavouriteView;
  /** The saved style's sizes, in shop order; sold out ones stay, struck through and disabled. */
  sizes: Extract<BagChoice, { kind: "size" }>["sizes"];
  /** The bag already holds a size of this style: the pill says "Added". */
  added: boolean;
};

/**
 * A favourite's "Add to bag" for a style with sizes (specs/favourites.md "Nike layout"), like Nike's quick add: a
 * `Dialog size="split"` with the style's photos on the left (from lg; previous/next buttons), the name, "Category ·
 * Style" and price on the right, the sizes in the product page's boxes (`sizeGridColumns`), then "View full product"
 * and "Add to bag". Focus starts on the first size. Pressed before a size is picked, Add to bag says "Select a size",
 * rings the sizes in red and focuses the first one. Adding closes the popup and opens the "Added to bag" panel, which
 * sends focus back to the card's pill. Errors show inside the popup: behind a modal a toast is hidden from screen
 * readers. While an add runs the popup stays open (no X; Escape and a click outside wait), so its answer shows here.
 */
export function AddToBagDialog({ item, sizes, added }: AddToBagDialogProps) {
  const { product } = item;
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState("");
  // "Add to bag" was pressed before a size was picked.
  const [sizeMissing, setSizeMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  // The "Added to bag" panel took focus: the closing popup mustn't pull it back to the card.
  const handedToBag = useRef(false);
  const messageId = useId();
  const { add, pending } = useAddToBag();
  const picked = sizes.find((variant) => variant.id === variantId && variant.stock > 0);
  const message = sizeMissing ? "Select a size" : error;

  const focusFirstSize = () =>
    groupRef.current?.querySelector<HTMLElement>('[role="radio"]:not(:disabled)')?.focus();

  // Each opening starts afresh: no size, no message.
  function reset() {
    setVariantId("");
    setSizeMissing(false);
    setError(null);
  }

  // Escape, the X and a click outside. Closing waits while an add runs.
  function changeOpen(next: boolean) {
    if (!next && pending) return;
    handedToBag.current = false;
    reset();
    setOpen(next);
  }

  function addToBag() {
    setError(null);
    if (!picked) {
      setSizeMissing(true);
      focusFirstSize();
      return;
    }
    add(picked, {
      returnFocusTo: triggerRef.current,
      onAdded: () => {
        handedToBag.current = true;
        reset();
        setOpen(false);
      },
      onError: setError,
    });
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button ref={triggerRef} variant="secondary" size="lg" shape="pill">
          <BagPillLabel added={added} />
        </Button>
      </DialogTrigger>
      <DialogContent
        size="split"
        title={product.name}
        description={favouriteDetails(item)}
        hideClose={pending}
        aside={<StylePhotos photos={item.photos} productName={product.name} />}
        media={<CloudImage src={product.imageUrl} alt="" ratio="square" sizes="64px" />}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusFirstSize();
        }}
        onCloseAutoFocus={(event) => {
          if (!handedToBag.current) return;
          handedToBag.current = false;
          event.preventDefault();
        }}
        footer={
          <div className="flex items-center justify-between gap-4">
            <ButtonLink href={favouriteHref(item)} variant="underline">
              View full product
            </ButtonLink>
            <Button size="lg" shape="pill" loading={pending} onClick={addToBag}>
              Add to bag
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          {/* A picked size shows its own price; until then the style's lowest, as on the card. */}
          <Price paisa={picked?.pricePaisa ?? product.fromPricePaisa} className="text-body font-medium" />
          <div>
            <RadioGroup
              ref={groupRef}
              variant="card"
              aria-label="Select size"
              aria-invalid={sizeMissing || undefined}
              aria-describedby={message ? messageId : undefined}
              value={variantId}
              onValueChange={(value) => {
                setVariantId(value);
                setSizeMissing(false);
                setError(null);
              }}
              className={sizeGridColumns(sizes.map((variant) => variant.size))}
            >
              {sizes.map((variant) => (
                <RadioGroupItem
                  key={variant.id}
                  value={variant.id}
                  label={variant.size}
                  disabled={variant.stock <= 0}
                  // A name longer than its box wraps instead of running over the border.
                  className="text-center wrap-anywhere"
                />
              ))}
            </RadioGroup>
            <div role="alert">
              {message && (
                <p id={messageId} className="pt-3 text-body text-danger">
                  {message}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The popup's left pane (from lg): one photo of the style filling it, with round previous/next buttons on its bottom
 * right that wrap around, as on the product page's gallery; a hidden live region says which photo shows.
 */
function StylePhotos({ photos, productName }: { photos: FavouriteView["photos"]; productName: string }) {
  const [index, setIndex] = useState(0);
  const current = photos[index] ?? photos[0];
  const step = (by: number) => setIndex((index + by + photos.length) % photos.length);

  return (
    <>
      <CloudImage
        key={current?.id}
        src={current?.url ?? null}
        alt={current?.alt ?? productName}
        ratio="none"
        sizes="(min-width: 1024px) 512px, 100vw"
        className="absolute inset-0"
      />
      {photos.length > 1 && (
        <>
          <div className="absolute right-6 bottom-6 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label="Previous photo"
              onClick={() => step(-1)}
            >
              <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label="Next photo"
              onClick={() => step(1)}
            >
              <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
            </Button>
          </div>
          <p className="sr-only" aria-live="polite">
            Photo {index + 1} of {photos.length}
          </p>
        </>
      )}
    </>
  );
}
