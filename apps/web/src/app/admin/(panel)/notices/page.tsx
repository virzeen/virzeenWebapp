import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { NoticeManager } from "@/client/features/admin/notice-manager";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminNotices } from "@/server/queries/notices";

export const metadata = { title: "Notices" };

/** The notices in the black bar above the shop header (specs/top-notice-bar.md). */
export default async function AdminNoticesPage() {
  await requireAdminPage();
  const notices = await listAdminNotices();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Notices"
        description="Lines in the black bar at the very top of the shop, like an offer or a launch. They rotate every 5 seconds. With none active, a built-in line is shown."
      />
      <NoticeManager notices={notices} />
    </div>
  );
}
