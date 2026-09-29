import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Any URL no other route matches. Throwing here shows (site)/not-found.tsx inside the header and footer,
 * instead of the bare root 404, so the shopper keeps the menu and bag to find their way on.
 */
export default function MissingPage() {
  notFound();
}
