import { cn } from "@virzeen/ui";

export const LOW_STOCK_THRESHOLD = 3;

/** "In stock" / "Only N left" / "Out of stock" from a number (content-style.md). */
export function StockLabel({ stock, className }: { stock: number; className?: string }) {
  const [text, tone] =
    stock <= 0
      ? ["Out of stock", "text-danger"]
      : stock <= LOW_STOCK_THRESHOLD
        ? [`Only ${stock} left`, "text-warning"]
        : ["In stock", "text-success"];
  return (
    <p className={cn("gap-2 flex items-center text-small", tone, className)} aria-live="polite">
      <span className="size-2 rounded-full bg-current" aria-hidden />
      {text}
    </p>
  );
}
