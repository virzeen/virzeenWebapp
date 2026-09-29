import { Link } from "@virzeen/ui";
import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";
import { SITE } from "@/client/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about an order, sizing or a collaboration? Get in touch with Virzeen.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <ContentPage
      eyebrow="Contact"
      title="We're here to help."
      intro="Questions about an order, sizing or a collaboration — write to us."
    >
      <ContentHeading>Email</ContentHeading>
      <p>
        For orders and sizing, email <Link href={`mailto:${SITE.salesEmail}`}>{SITE.salesEmail}</Link>.
      </p>
      <p>
        For collaborations and anything else, email{" "}
        <Link href={`mailto:${SITE.infoEmail}`}>{SITE.infoEmail}</Link>.
      </p>
      <p>We reply within one working day.</p>
      <ContentHeading>Instagram</ContentHeading>
      <p>
        See new pieces and preorders first on Instagram:{" "}
        <Link href={SITE.instagram}>{SITE.instagramHandle}</Link>.
      </p>
      <ContentHeading>Your orders</ContentHeading>
      <p>
        Track an order and see its status any time in <Link href="/account/orders">your account</Link>. Please
        include your order number (for example VZ-260928-0042) when you write to us.
      </p>
    </ContentPage>
  );
}
