import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of sale for orders placed with Virzeen.",
  alternates: { canonical: "/terms" },
};

// ◆ Owner/legal review before launch.
export default function TermsPage() {
  return (
    <ContentPage eyebrow="Legal" title="Terms of sale" draftNotice>
      <ContentHeading>Prices</ContentHeading>
      <p>
        All prices are in Nepali rupees and include 13% VAT. Shipping is added at checkout before you pay.
      </p>
      <ContentHeading>Orders</ContentHeading>
      <p>
        Your order is confirmed when we email you an order number. Online payments are confirmed with eSewa or
        Khalti before an order is accepted; items are held for 60 minutes while you pay.
      </p>
      <ContentHeading>Cash on delivery</ContentHeading>
      <p>
        Pay the courier in cash when your order arrives. Cash on delivery is available for orders up to a set
        limit.
      </p>
    </ContentPage>
  );
}
