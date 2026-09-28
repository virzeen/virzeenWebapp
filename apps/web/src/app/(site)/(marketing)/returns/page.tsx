import { Link } from "@virzeen/ui";
import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "Returns",
  description: "7-day free returns on every Virzeen order.",
  alternates: { canonical: "/returns" },
};

// Owner decision 2026-09-28: 7-day returns, no fee. Details below (condition, pickup, refund timing,
// exchanges) await owner confirmation (docs/STATUS.md).
export default function ReturnsPage() {
  return (
    <ContentPage
      eyebrow="Help"
      title="Returns & refunds"
      intro="Changed your mind? Send it back within 7 days. Returns are free."
    >
      <ContentHeading>7 days, no fee</ContentHeading>
      <p>
        You can return any item within 7 days of delivery. Returns cost you nothing: we arrange the pickup,
        and you get back the full price you paid.
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
        <li>We arrange a free pickup from your address.</li>
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
