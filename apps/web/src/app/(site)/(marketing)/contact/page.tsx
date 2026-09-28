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
        <Link href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</Link> — we reply within one working
        day.
      </p>
      <ContentHeading>Your orders</ContentHeading>
      <p>
        Track an order and see its status any time in <Link href="/account/orders">your account</Link>. Please
        include your order number (for example VZ-260928-0042) when you write to us.
      </p>
    </ContentPage>
  );
}
