"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  RadioGroup,
  RadioGroupItem,
} from "@virzeen/ui";
import { useId, useRef, useState } from "react";
import { sizeGridColumns } from "@/client/features/products/size-grid";
import type { BagChoice } from "./favourite-bag";
import { useAddToBag } from "./use-add-to-bag";

type SelectSizeDialogProps = {
  productName: string;
  /** The saved style's sizes, in shop order; sold out ones stay, struck through and disabled. */
  sizes: Extract<BagChoice, { kind: "size" }>["sizes"];
};

/**
 * A favourite's "Select size" (specs/favourites.md "Nike layout"): a small popup titled "Select size" with the product
 * name, the style's sizes in the product page's boxes (`sizeGridColumns`), and "Add to bag". Pressed before a size is
 * picked, it says "Select a size" and focuses the first size. Adding closes the popup and opens the bag, which sends
 * focus back to "Select size". Errors show inside the popup: behind a modal a toast is hidden from screen readers.
 * While an add runs the popup stays open (no X; Escape and a click outside wait), so its answer always shows here.
 */
export function SelectSizeDialog({ productName, sizes }: SelectSizeDialogProps) {
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState("");
  // "Add to bag" was pressed before a size was picked.
  const [sizeMissing, setSizeMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  // The bag drawer took focus: the closing popup mustn't pull it back to the card.
  const handedToBag = useRef(false);
  const messageId = useId();
  const { add, pending } = useAddToBag();
  const picked = sizes.find((variant) => variant.id === variantId && variant.stock > 0);
  const message = sizeMissing ? "Select a size" : error;

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
      groupRef.current?.querySelector<HTMLElement>('[role="radio"]:not(:disabled)')?.focus();
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
        <Button ref={triggerRef} variant="secondary" shape="pill" className="w-full">
          Select size
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Select size"
        description={productName}
        hideClose={pending}
        onCloseAutoFocus={(event) => {
          if (!handedToBag.current) return;
          handedToBag.current = false;
          event.preventDefault();
        }}
        footer={
          <DialogFooter>
            <Button size="lg" shape="pill" className="w-full" loading={pending} onClick={addToBag}>
              Add to bag
            </Button>
          </DialogFooter>
        }
      >
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
              <p id={messageId} className="pt-2 text-small text-danger">
                {message}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
