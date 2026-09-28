import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";

type SummaryLine = {
  id: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  lineTotalPaisa: number;
  imageUrl: string | null;
  imageAlt: string;
  isAvailable: boolean;
};

/** Compact list of bag lines for the checkout summary. */
export function OrderSummaryLines({ items }: { items: SummaryLine[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items
        .filter((item) => item.isAvailable)
        .map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <div className="relative w-14 shrink-0">
              <CloudImage src={item.imageUrl} alt={item.imageAlt} sizes="56px" />
              <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-ink text-caption text-canvas">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-small">{item.productName}</p>
              <p className="text-small text-ink-muted">{item.variantLabel}</p>
            </div>
            <Price paisa={item.lineTotalPaisa} className="text-small" />
          </li>
        ))}
    </ul>
  );
}
