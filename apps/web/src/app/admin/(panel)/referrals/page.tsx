import { Badge, DataTable, EmptyState } from "@virzeen/ui";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { formatDateTime } from "@/client/lib/format";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminReferrals } from "@/server/queries/admin";

export const metadata = { title: "Referrals" };

/** Friends who joined with a member's code, and whether the member's reward has been paid (specs/member-perks.md). */
export default async function AdminReferralsPage() {
  await requireAdminPage();
  const rows = await listAdminReferrals();
  const paid = rows.filter((row) => row.rewardedAt !== null).length;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Referrals"
        description={`${rows.length} ${rows.length === 1 ? "referral" : "referrals"}, ${paid} rewarded. The reward is paid when the friend's first order is delivered.`}
      />
      <DataTable
        caption="Referrals"
        rows={rows}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            title="No referrals yet."
            description="They appear when a friend enters a member's code."
          />
        }
        columns={[
          {
            key: "referrer",
            header: "Member",
            cell: (row) => (
              <span className="flex flex-col">
                <span>{row.referrer.name || row.referrer.email}</span>
                <span className="text-ink-muted">{row.referrer.email}</span>
              </span>
            ),
          },
          {
            key: "friend",
            header: "Friend",
            hideOnMobile: true,
            cell: (row) => (
              <span className="flex flex-col">
                <span>{row.referred.name || row.referred.email}</span>
                <span className="text-ink-muted">{row.referred.email}</span>
              </span>
            ),
          },
          {
            key: "joined",
            header: "Joined",
            hideBelow: "xl",
            cell: (row) => formatDateTime(row.createdAt),
          },
          {
            key: "status",
            header: "Reward",
            align: "right",
            cell: (row) =>
              row.rewardedAt ? (
                <span className="flex flex-col items-end gap-1">
                  <Badge variant="success">
                    Paid <Price paisa={row.rewardPaisa} />
                  </Badge>
                  {row.passGranted && <span className="text-ink-muted">Friend got a month of the Pass</span>}
                </span>
              ) : (
                <Badge>Waiting</Badge>
              ),
          },
        ]}
      />
    </div>
  );
}
