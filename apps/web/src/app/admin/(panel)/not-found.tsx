import { ButtonLink, EmptyState } from "@virzeen/ui";
import type { Metadata } from "next";

// Used when a page's generateMetadata calls notFound(); the page's own title applies otherwise.
export const metadata: Metadata = { title: "Not found" };

/**
 * A missing order, product or story, or a mistyped /admin address ([...missing]), inside the admin shell.
 * Only admins get here: for anyone else the layout's own notFound() falls through to the root 404, so
 * nothing about the admin area shows.
 */
export default function AdminNotFound() {
  return (
    <EmptyState
      titleAs="h1"
      title="This page doesn't exist, or the item was archived."
      action={
        <ButtonLink href="/admin" shape="pill">
          Back to dashboard
        </ButtonLink>
      }
    />
  );
}
