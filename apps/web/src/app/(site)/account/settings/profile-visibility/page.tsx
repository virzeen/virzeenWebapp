import { ReviewNameForm } from "@/client/features/account/settings-forms";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";
import { getMySettings } from "@/server/queries/account";

export const metadata = { title: "Profile visibility" };

/** Settings, Profile visibility: how the member's name shows on the product reviews they write. */
export default async function ProfileVisibilityPage() {
  const user = await requireUserPage("/account/settings/profile-visibility");
  const settings = await getMySettings(user.id);
  return (
    <SettingsShell title="Profile visibility" mode="section">
      <p className="text-body">
        Choose how your name appears on the product reviews you write. This applies to your past and future
        reviews.
      </p>
      <ReviewNameForm initial={settings.reviewNameStyle} />
    </SettingsShell>
  );
}
