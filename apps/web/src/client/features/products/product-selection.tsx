"use client";

import { createContext, useContext, useState } from "react";
import { priceFor, variantFor, type Variant } from "./selection";

type Selection = {
  variants: Variant[];
  /** The product's styles (variant colours) and sizes, in shop order. */
  colors: string[];
  sizes: string[];
  style: string | null;
  size: string | null;
  pickStyle: (style: string) => void;
  pickSize: (size: string) => void;
};

const SelectionContext = createContext<Selection | null>(null);

type ProductSelectionProviderProps = {
  variants: Variant[];
  colors: string[];
  sizes: string[];
  initialStyle: string | null;
  /** Shop page: a picked style goes into the address as `?style=` (not in the admin preview). */
  syncUrl: boolean;
  children: React.ReactNode;
};

/**
 * The style and size picked on the product page (specs/product-page.md), shared by the client leaves that follow
 * them: the price, the gallery, the tiles, the sizes, "Colour shown", the details popup and Favourite. Everything
 * between them stays server-rendered.
 */
export function ProductSelectionProvider({
  variants,
  colors,
  sizes,
  initialStyle,
  syncUrl,
  children,
}: ProductSelectionProviderProps) {
  const [pickedStyle, setStyle] = useState(initialStyle);
  const [pickedSize, setSize] = useState<string | null>(null);
  // The admin preview follows the editor: a picked style or size renamed or removed there falls back to the usual.
  const style = pickedStyle !== null && colors.includes(pickedStyle) ? pickedStyle : initialStyle;
  const size = pickedSize !== null && sizes.includes(pickedSize) ? pickedSize : null;

  function pickStyle(next: string) {
    setStyle(next);
    // The picked size carries over when the new style has it in stock.
    const same = size ? variantFor(variants, colors.length > 0, sizes.length > 0, next, size) : undefined;
    if (size && !(same && same.stock > 0)) setSize(null);
    if (syncUrl) {
      // No reload and no new history entry; the canonical address stays /product/{slug}.
      const params = new URLSearchParams(window.location.search);
      params.set("style", next);
      window.history.replaceState(null, "", `?${params.toString()}`);
    }
  }

  return (
    <SelectionContext value={{ variants, colors, sizes, style, size, pickStyle, pickSize: setSize }}>
      {children}
    </SelectionContext>
  );
}

/** The pick, the variant it points to (none until a needed size is picked) and the price to show for it. */
export function useProductSelection() {
  const selection = useContext(SelectionContext);
  if (!selection) throw new Error("useProductSelection must be used inside ProductSelectionProvider");
  const { variants, colors, sizes, style, size } = selection;
  const selected =
    sizes.length > 0 && !size
      ? undefined
      : variantFor(variants, colors.length > 0, sizes.length > 0, style, size);
  return { ...selection, selected, price: priceFor(variants, style, selected) };
}
