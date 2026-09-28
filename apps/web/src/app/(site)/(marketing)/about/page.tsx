import { ButtonLink } from "@virzeen/ui";
import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "About",
  description: "Virzeen is a monochrome label: black, white and every grey between.",
  alternates: { canonical: "/about" },
};

// Neutral brand story, kept at the owner's request on 2026-09-28; they may replace it with their own words.
export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About"
      title="timeless monochromium experience."
      intro="Virzeen works in black, white and every grey between."
    >
      <p>
        We believe restraint is a kind of confidence. Removing colour leaves shape, texture and proportion to
        do the talking — pieces that feel as right in ten years as they do today.
      </p>
      <ContentHeading>Shop with confidence</ContentHeading>
      <p>
        Prices include VAT and shipping across Nepal is free: 1–3 days inside Kathmandu Valley, 3–7 days
        elsewhere. Pay in cash when your order arrives, follow every order from your account, and send
        anything back within 7 days, free.
      </p>
      <div>
        <ButtonLink href="/shop" shape="pill">
          Shop the collection
        </ButtonLink>
      </div>
    </ContentPage>
  );
}
