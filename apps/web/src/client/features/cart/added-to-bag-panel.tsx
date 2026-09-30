"use client";

import { ButtonLink, DropPanel, DropPanelContent } from "@virzeen/ui";
import { CircleCheck } from "lucide-react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { useCart } from "./cart-provider";

/**
 * "Added to bag", like Nike's (owner request 2026-09-30, patterns.md §7): drops down under the header after an add,
 * shows what went in, then "View bag (N)" and "Checkout". The bag itself is the /cart page.
 */
export function AddedToBagPanel() {
  const { cart, isOpen, setOpen, returnFocusRef, addedLine } = useCart();
  const close = () => setOpen(false);

  return (
    <DropPanel open={isOpen} onOpenChange={setOpen}>
      <DropPanelContent
        title="Added to bag"
        icon={<CircleCheck className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />}
        // The panel has no trigger: send focus back to whatever opened it (the Add to bag button).
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef.current;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus();
          }
        }}
        footer={
          <>
            <ButtonLink href="/cart" variant="secondary" size="lg" shape="pill" onClick={close}>
              View bag ({cart.itemCount})
            </ButtonLink>
            <ButtonLink href="/checkout" size="lg" shape="pill" onClick={close}>
              Checkout
            </ButtonLink>
          </>
        }
      >
        {addedLine && (
          <div className="flex gap-4">
            <CloudImage
              src={addedLine.imageUrl}
              alt={addedLine.imageAlt}
              sizes="80px"
              className="w-20 shrink-0"
            />
            <div className="flex min-w-0 flex-col gap-0.5 wrap-anywhere">
              <p className="text-body font-medium text-ink">{addedLine.productName}</p>
              <p className="text-small text-ink-muted">{addedLine.variantLabel}</p>
              <Price paisa={addedLine.unitPricePaisa} className="pt-1 text-body text-ink" />
            </div>
          </div>
        )}
      </DropPanelContent>
    </DropPanel>
  );
}
