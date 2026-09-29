"use client";

import { createContext, useContext, useState } from "react";

type SelectedStyle = { style: string | null; setStyle: (style: string | null) => void };

const SelectedStyleContext = createContext<SelectedStyle | null>(null);

/**
 * Shares the style picked in ProductPurchase with the gallery (specs/product-styles.md). Only these two read it;
 * everything between them on the product page stays server-rendered.
 */
export function SelectedStyleProvider({
  initialStyle,
  children,
}: {
  initialStyle: string | null;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState(initialStyle);
  return <SelectedStyleContext value={{ style, setStyle }}>{children}</SelectedStyleContext>;
}

/** The picked style; outside a provider (a lone picker) the component keeps its own. */
export function useSelectedStyle(initialStyle: string | null): SelectedStyle {
  const shared = useContext(SelectedStyleContext);
  const [style, setStyle] = useState(initialStyle);
  return shared ?? { style, setStyle };
}
