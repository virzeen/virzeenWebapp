import { ButtonLink, EmptyState } from "@virzeen/ui";
import type { Metadata } from "next";

// Used when the page's generateMetadata calls notFound(); the page's own title applies otherwise.
export const metadata: Metadata = { title: "Order not found" };

/** A missing order (or someone else's) stays inside the account shell, with a way back to the list. */
export default function OrderNotFound() {
  return (
    <EmptyState
      titleAs="h2"
      title="We couldn't find that order in your account."
      description="If you ordered with a different email, sign in with that one."
      action={
        <ButtonLink href="/account/orders" shape="pill">
          All orders
        </ButtonLink>
      }
    />
  );
}
