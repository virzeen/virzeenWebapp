"use client";

import { Button, ButtonLink, Container, EmptyState, Skeleton } from "@virzeen/ui";
import { Eye, Smartphone, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { ProductDetails } from "@/client/features/products/product-details";
import {
  previewStorageKey,
  previewUrl,
  readPreviewDraft,
  toPreviewProduct,
  type PreviewDraft,
} from "./preview-draft";

/** The draft the editor last handed over; `undefined` while rendering on the server (no localStorage there). */
function useDraft(key: string) {
  const raw = useSyncExternalStore(
    (onChange) => {
      // "storage" fires in this tab whenever the editor tab writes the draft.
      const listener = (event: StorageEvent) => {
        if (event.key === previewStorageKey(key)) onChange();
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
    () => readPreviewDraft(key),
    () => undefined,
  );
  return useMemo(() => {
    if (raw === undefined || raw === null) return raw;
    try {
      return toPreviewProduct(JSON.parse(raw) as PreviewDraft);
    } catch {
      return null; // left by an older version of the editor
    }
  }, [raw]);
}

/** Admin preview of a product page from the editor's current values (specs/admin-product-editor.md "Preview"). */
export function ProductPreview({ previewKey }: { previewKey: string }) {
  const product = useDraft(previewKey);

  return (
    <>
      <div className="border-b border-line bg-surface">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-2">
          <p className="flex items-center gap-2 text-small">
            <Eye className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <span>
              <strong className="font-medium">Preview:</strong> only you can see this. It updates as you edit.
            </span>
          </p>
          <div className="flex gap-1">
            {/* Already phone-sized below md, so the button only shows on wider screens. */}
            <Button
              variant="ghost"
              size="sm"
              shape="pill"
              className="max-md:hidden"
              onClick={() =>
                window.open(
                  previewUrl(previewKey),
                  `virzeen-preview-phone-${previewKey}`,
                  "popup,width=390,height=844",
                )
              }
            >
              <Smartphone className="size-4" strokeWidth={1.5} aria-hidden />
              Phone size
            </Button>
            <Button variant="ghost" size="sm" shape="pill" onClick={() => window.close()}>
              <X className="size-4" strokeWidth={1.5} aria-hidden />
              Close preview
            </Button>
          </div>
        </Container>
      </div>
      {product === undefined ? (
        // The product page's layout (product-details.tsx): name and price on the right from lg, gallery left.
        <Container className="grid gap-6 py-12 lg:grid-cols-[3fr_2fr] lg:grid-rows-[auto_1fr] lg:gap-x-16">
          <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1 lg:max-w-md">
            <Skeleton shape="text" className="w-2/3" />
            <Skeleton shape="text" className="w-1/3" />
          </div>
          <Skeleton shape="image" className="lg:col-start-1 lg:row-span-2 lg:row-start-1" />
        </Container>
      ) : product === null ? (
        <Container className="py-16">
          <EmptyState
            titleAs="h1"
            title="Nothing to preview yet."
            description="Open a product in the admin and press Preview."
            action={
              <ButtonLink href="/admin/products" variant="secondary" shape="pill">
                Go to products
              </ButtonLink>
            }
          />
        </Container>
      ) : product.variants.length === 0 ? (
        <Container className="py-16">
          <EmptyState
            titleAs="h1"
            title="Nothing is ticked For sale."
            description="Customers can't open a product page with nothing for sale. Tick For sale on a size or colour in the editor to see it here."
          />
        </Container>
      ) : (
        <ProductDetails product={product} preview />
      )}
    </>
  );
}
