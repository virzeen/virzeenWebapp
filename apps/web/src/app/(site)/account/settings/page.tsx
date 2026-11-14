import { Separator } from "@virzeen/ui";
import { SignOutButton } from "@/client/components/shared/sign-out-button";
import { AccountDetails } from "@/client/features/account/account-details";
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
      <AccountDetails
        name={user.name}
        email={user.email}
        birthday={settings.birthday}
        showPassword={user.role !== "ADMIN"}
        canDelete={user.role !== "ADMIN"}
      />
      <Separator />
      <SignOutButton className="self-start" />
    </SettingsShell>
  );
}
