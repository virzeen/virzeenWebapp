import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Delivery across Nepal, free on larger orders. Pay in cash when your order arrives.",
  alternates: { canonical: "/shipping" },
};

// Delivery times confirmed by the owner on 2026-09-28.
export default function ShippingPage() {
  return (
    <ContentPage eyebrow="Help" title="Shipping">
      <p>
        Delivery across Nepal costs Rs 200 for guest orders and Rs 150 for MONO Members (a free account). It
        is free on guest orders of Rs 4,000 or more and on member orders of Rs 3,000 or more. The fee is shown
        before you place the order.
      </p>
      <ContentHeading>Delivery times</ContentHeading>
      <p>
        We send guest orders within 48 hours and MONO Member orders within 24 hours. After that, orders arrive
        the same day inside Kathmandu Valley and in 2–4 days elsewhere in Nepal. Checkout shows the date.
      </p>
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
