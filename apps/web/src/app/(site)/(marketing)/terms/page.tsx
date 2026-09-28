import { Link } from "@virzeen/ui";
import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";
import { SITE } from "@/client/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of sale for orders placed with Virzeen.",
  alternates: { canonical: "/terms" },
};

// Owner approved publishing without the draft notice on 2026-09-28.
export default function TermsPage() {
  return (
    <ContentPage eyebrow="Legal" title="Terms of sale">
      <ContentHeading>Prices</ContentHeading>
      <p>All prices are in Nepali rupees and include 13% VAT and delivery. Shipping within Nepal is free.</p>
      <ContentHeading>Orders</ContentHeading>
      <p>
        Your order is confirmed when we email you an order number. To change or cancel an order, email{" "}
        <Link href={`mailto:${SITE.salesEmail}`}>{SITE.salesEmail}</Link> before it ships.
      </p>
      <ContentHeading>Cash on delivery</ContentHeading>
      <p>Pay the courier in cash when your order arrives.</p>
      <ContentHeading>Returns</ContentHeading>
      <p>
        You can return items within 7 days of delivery, free of charge. See our{" "}
        <Link href="/returns">returns policy</Link>.
      </p>
    </ContentPage>
  );
}
