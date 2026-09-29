import type { Metadata } from "next";
import { ProductPreview } from "@/client/features/admin/product-preview";
import { requireAdminPage } from "@/server/auth/session";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

// Admin preview of a product page from the editor's unsaved values (specs/admin-product-editor.md "Preview").
// Inside the shop layout so it has the real header and footer; admins only, never indexed.
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default async function ProductPreviewPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const { key } = flattenSearchParams(await searchParams);
  // Only names the editor's draft in this browser's storage: a product id or "new".
  const previewKey = typeof key === "string" && /^[a-z0-9]{1,40}$/.test(key) ? key : "new";
  return <ProductPreview previewKey={previewKey} />;
}
