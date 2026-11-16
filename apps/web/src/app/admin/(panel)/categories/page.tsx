import { permanentRedirect } from "next/navigation";

/** Categories and collections are one admin page now (specs/catalog-groups-visibility.md). */
export default function AdminCategoriesPage() {
  permanentRedirect("/admin/collections");
}
