import { Link } from "@virzeen/ui";
import type { Metadata } from "next";
import { ContentHeading, ContentPage } from "@/client/components/shared/content-page";

export const metadata: Metadata = {
  title: "Returns",
  description: "How returns and refunds work at Virzeen.",
  alternates: { canonical: "/returns" },
};

// ◆ Owner decision pending: return window and conditions (payment-policy.md §10).
export default function ReturnsPage() {
  return (
    <ContentPage eyebrow="Help" title="Returns & refunds" draftNotice>
      <p>
        If something isn&apos;t right with your order, <Link href="/contact">contact us</Link> with your order
        number and we&apos;ll arrange the next steps with you.
      </p>
      <ContentHeading>Refunds</ContentHeading>
      <p>Refunds for cash on delivery orders are arranged with you directly.</p>
    </ContentPage>
  );
}
