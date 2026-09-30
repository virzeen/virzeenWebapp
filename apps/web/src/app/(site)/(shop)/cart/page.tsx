import { Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { CartPageContent } from "@/client/features/cart/cart-page-content";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Bag", robots: { index: false } };

// Messages a redirect back to the bag can carry (content-style.md "Standard messages").
const NOTICES: Record<string, { tone: "warning" | "info"; text: string }> = {
  "out-of-stock": { tone: "warning", text: "Some items just sold out. We've updated your bag." },
  "price-changed": {
    tone: "warning",
    text: "A price changed since you added this item. Please review your bag.",
  },
  empty: { tone: "info", text: "Add something to your bag to check out." },
};

export default async function CartPage({ searchParams }: { searchParams: SearchParams }) {
  const notice = NOTICES[flattenSearchParams(await searchParams).notice ?? ""];
  return (
    <Container className="py-8 lg:py-12">
      <CartPageContent notice={notice ?? null} />
    </Container>
  );
}
