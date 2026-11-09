import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { DiscountManager } from "@/client/features/admin/discount-manager";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminDiscounts } from "@/server/queries/admin";

export const metadata = { title: "Discounts" };

/** Discount codes customers type at checkout (specs/discount-codes.md). */
export default async function AdminDiscountsPage() {
  await requireAdminPage();
  const codes = await listAdminDiscounts();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Discounts"
        description="Codes customers type at checkout. A cancelled order gives its use back."
      />
      <DiscountManager codes={codes} />
    </div>
  );
}
