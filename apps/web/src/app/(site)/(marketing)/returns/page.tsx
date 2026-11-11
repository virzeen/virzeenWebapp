import { Link } from "@virzeen/ui";
import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "Returns",
  description: "7-day returns on every Virzeen order. 15 days and free pickup with the Monochrome Pass.",
  alternates: { canonical: "/returns" },
};

// Owner decisions 2026-09-28: 7-day returns; condition, refund within 5 working days and free size exchange confirmed
// the same day. 2026-11-11: free pickup and 15 days are for the Monochrome Pass only (docs/payments/payment-policy.md §10).
export default function ReturnsPage() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Returns & refunds"
      intro="Changed your mind? Send it back within 7 days, or 15 days with the Monochrome Pass."
    >
      <ContentHeading>7 days, or 15 with the Pass</ContentHeading>
      <p>
        You can return any item within 7 days of delivery, as a guest or a MONO Member. With the{" "}
        <Link href="/membership">Monochrome Pass</Link> you have 15 days and we collect the items for free.
        Otherwise you pay for the pickup; we tell you the cost when you contact us. Either way you get back
        the full price you paid for the items.
      </p>
      <ContentHeading>What we accept</ContentHeading>
      <ul className="flex list-disc flex-col gap-2 pl-6">
        <li>Unworn and unwashed</li>
        <li>With the tags still attached</li>
        <li>In the original packaging</li>
      </ul>
      <ContentHeading>How to return</ContentHeading>
      <ol className="flex list-decimal flex-col gap-2 pl-6">
        <li>
          <Link href="/contact">Contact us</Link> with your order number and the items you&apos;re returning.
        </li>
        <li>We arrange the pickup from your address (free with the Monochrome Pass).</li>
        <li>We check the items when they reach us.</li>
      </ol>
      <ContentHeading>Refunds</ContentHeading>
      <p>
        Once we&apos;ve checked the items, we refund the full price within 5 working days. For cash on
        delivery orders we send the refund to your bank account or digital wallet, and confirm the details
        with you first.
      </p>
      <ContentHeading>Exchanges</ContentHeading>
      <p>
        Need a different size? Tell us when you contact us and we&apos;ll swap it for free if it&apos;s in
        stock.
      </p>
      <ContentHeading>Damaged or wrong item</ContentHeading>
      <p>
        If something arrives damaged or isn&apos;t what you ordered, contact us within 7 days of delivery and
        we&apos;ll replace it or refund you in full, pickup included.
      </p>
    </ContentPage>
  );
}
