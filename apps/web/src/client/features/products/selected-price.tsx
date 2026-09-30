"use client";

import { Price } from "@/client/components/shared/price";
import { useProductSelection } from "./product-selection";

/**
 * The price under the product name: the picked style's (or size's) price, so it changes with the pick. Announced
 * politely when it changes, like the stock label.
 */
export function SelectedPrice({ className }: { className?: string }) {
  const { price } = useProductSelection();
  return (
    <p className={className} aria-live="polite">
      <Price paisa={price.paisa} from={price.from} />
    </p>
  );
}
