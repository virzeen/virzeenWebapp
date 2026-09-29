import { ShopListingSkeleton } from "@/client/features/products/shop-listing";

/** Skeleton for a collection: the shop listing plus its intro line (ui-discipline.md §6). */
export default function CollectionLoading() {
  return <ShopListingSkeleton intro />;
}
