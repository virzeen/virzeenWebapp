import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Free shipping across Nepal. Pay in cash when your order arrives.",
  alternates: { canonical: "/shipping" },
};

// Delivery times confirmed by the owner on 2026-09-28.
export default function ShippingPage() {
  return (
    <ContentPage eyebrow="Help" title="Shipping">
      <p>
        Shipping is free everywhere in Nepal. The price you see on a product already includes delivery, so
        there is nothing extra to pay at checkout.
      </p>
      <ContentHeading>Delivery times</ContentHeading>
      <p>Orders usually arrive in 1–3 days inside Kathmandu Valley and 3–7 days elsewhere in Nepal.</p>
      <ContentHeading>Paying</ContentHeading>
      <p>Pay the courier in cash when your order arrives. Please have the exact amount ready if you can.</p>
      <ContentHeading>Tracking</ContentHeading>
      <p>
        When your order ships we email you the courier and tracking number. You can also follow it in your
        account.
      </p>
    </ContentPage>
  );
}
