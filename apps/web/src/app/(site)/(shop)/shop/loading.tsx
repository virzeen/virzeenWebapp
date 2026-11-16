import { ShopListingSkeleton } from "@/client/features/products/shop-listing";

/** Skeleton for /shop and /collections/[slug] (ui-discipline.md §6). */
export default function ShopLoading() {
  return <ShopListingSkeleton />;
}
