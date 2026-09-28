import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Delivery across Nepal. Shipping costs are shown at checkout before you pay.",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <ContentPage eyebrow="Help" title="Shipping" draftNotice>
      <p>
        We deliver across Nepal. Your shipping cost is calculated from your delivery address and shown at
        checkout before you pay.
      </p>
      <ContentHeading>Delivery times</ContentHeading>
      <p>Orders usually arrive in 1–3 days inside Kathmandu Valley and 3–7 days elsewhere in Nepal.</p>
      <ContentHeading>Tracking</ContentHeading>
      <p>
        When your order ships we email you the courier and tracking number. You can also follow it in your
        account.
      </p>
    </ContentPage>
  );
}
