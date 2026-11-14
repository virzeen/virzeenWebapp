import { Separator } from "@virzeen/ui";
import { SignOutButton } from "@/client/components/shared/sign-out-button";
import { AccountDetailsExtras } from "@/client/features/account/account-details-extras";
import { ProfileForm } from "@/client/features/account/profile-form";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";
import { getMySettings } from "@/server/queries/account";

export const metadata = { title: "Settings" };

/** Settings: from md the list and Account details side by side; on phones only the list, then Sign out. */
export default async function SettingsPage() {
  const user = await requireUserPage("/account/settings");
  const settings = await getMySettings(user.id);
  return (
    <SettingsShell title="Account details" mode="menu" menuFooter={<SignOutButton className="self-start" />}>
      <ProfileForm name={user.name} email={user.email} />
      <AccountDetailsExtras birthday={settings.birthday} showPassword={user.role !== "ADMIN"} />
      <Separator />
      <SignOutButton className="self-start" />
    </SettingsShell>
  );
}
