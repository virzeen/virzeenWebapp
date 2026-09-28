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
      <p>All prices are in Nepali rupees and include 13% VAT and delivery. Shipping within Nepal is free.</p>
      <ContentHeading>Orders</ContentHeading>
      <p>Your order is confirmed when we email you an order number.</p>
      <ContentHeading>Cash on delivery</ContentHeading>
      <p>Pay the courier in cash when your order arrives.</p>
    </ContentPage>
  );
}
