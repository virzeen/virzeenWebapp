import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/server/auth/session";

export const metadata: Metadata = { title: "Not found" };

/**
 * Any /admin address no other admin page matches, e.g. a mistyped link. Throwing here shows the admin
 * not-found page ("Back to dashboard") inside the admin frame, not the shop's 404. Anyone who isn't a verified
 * admin is handled by requireAdminPage first, exactly as on every other admin page.
 */
export default async function AdminMissingPage() {
  await requireAdminPage();
  notFound();
}
