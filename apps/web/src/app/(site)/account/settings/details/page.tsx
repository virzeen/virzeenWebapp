import { Separator } from "@virzeen/ui";
import { SignOutButton } from "@/client/components/shared/sign-out-button";
import { AccountDetailsExtras } from "@/client/features/account/account-details-extras";
import { ProfileForm } from "@/client/features/account/profile-form";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";
import { getMySettings } from "@/server/queries/account";

export const metadata = { title: "Account details" };

/** Account details as its own page, where the phone Settings list leads (from md it looks like /account/settings). */
export default async function AccountDetailsPage() {
  const user = await requireUserPage("/account/settings/details");
  const settings = await getMySettings(user.id);
  return (
    <SettingsShell title="Account details" mode="section">
      <ProfileForm name={user.name} email={user.email} />
      <AccountDetailsExtras birthday={settings.birthday} showPassword={user.role !== "ADMIN"} />
      <Separator />
      <SignOutButton className="self-start" />
    </SettingsShell>
  );
}
