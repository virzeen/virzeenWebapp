"use client";

import { ButtonLink, DropPanel, DropPanelContent } from "@virzeen/ui";
import { CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";

/** What "Added to favourites" shows: the product as it was saved. */
export type AddedFavourite = {
  name: string;
  /** "Tops · Bone" (the category and the style), or just one of them. */
  details: string;
  imageUrl: string | null;
  imageAlt: string;
  pricePaisa: number;
};

/** Opens the panel for what was just saved; focus goes back to `returnFocusTo` (the pressed button) on close. */
type ShowAdded = (added: AddedFavourite, returnFocusTo: HTMLElement | null) => void;

const AddedToFavouritesContext = createContext<ShowAdded | null>(null);

/**
 * "Added to favourites", like Nike's (owner request 2026-10-01, specs/favourites.md): after a Favourite press saves a
 * product, a panel drops down under the header on the right (phones: across the top) with a green tick, the photo,
 * name, details and price, and "View favourites". A `DropPanel`: modal, Escape or a click outside closes it, and focus
 * goes back to the button that saved. Inside `FavouritesProvider`, so every Favourite button can open it.
 */
export function AddedToFavouritesProvider({ children }: { children: React.ReactNode }) {
  const [added, setAdded] = useState<AddedFavourite | null>(null);
  const [open, setOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const show = useCallback<ShowAdded>((next, returnFocusTo) => {
    returnFocusRef.current = returnFocusTo;
    setAdded(next);
    setOpen(true);
  }, []);

  return (
    <AddedToFavouritesContext value={show}>
      {children}
      <DropPanel open={open} onOpenChange={setOpen}>
        <DropPanelContent
          title="Added to favourites"
          // A white tick on a green disc, as on the "Added" pill.
          icon={
            <CircleCheck className="size-5 shrink-0 fill-success text-canvas" strokeWidth={1.5} aria-hidden />
          }
          // The panel has no trigger: send focus back to the Favourite button that saved.
          onCloseAutoFocus={(event) => {
            const target = returnFocusRef.current;
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
            }
          }}
          footer={
            <ButtonLink href="/favourites" size="lg" shape="pill" onClick={() => setOpen(false)}>
              View favourites
            </ButtonLink>
          }
        >
          {added && (
            <div className="flex gap-4">
              <CloudImage
                src={added.imageUrl}
                alt={added.imageAlt}
                ratio="square"
                sizes="96px"
                className="w-24 shrink-0"
              />
              <div className="flex min-w-0 flex-col gap-0.5 wrap-anywhere">
                <p className="text-body font-medium text-ink">{added.name}</p>
                {added.details && <p className="text-body text-ink-muted">{added.details}</p>}
                <Price paisa={added.pricePaisa} className="pt-1 text-body text-ink" />
              </div>
            </div>
          )}
        </DropPanelContent>
      </DropPanel>
    </AddedToFavouritesContext>
  );
}

export function useShowAddedFavourite(): ShowAdded {
  const show = useContext(AddedToFavouritesContext);
  if (!show) throw new Error("useShowAddedFavourite must be used inside <AddedToFavouritesProvider>.");
  return show;
}
