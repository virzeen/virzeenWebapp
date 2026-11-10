import { Separator } from "@virzeen/ui";
import { SignOutButton } from "@/client/components/shared/sign-out-button";
import { ProfileForm } from "@/client/features/account/profile-form";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";

export const metadata = { title: "Account details" };

/** Account details as its own page, where the phone Settings list leads (from md it looks like /account/settings). */
export default async function AccountDetailsPage() {
  const user = await requireUserPage("/account/settings/details");
  return (
    <SettingsShell title="Account details" mode="section">
      <ProfileForm name={user.name} email={user.email} />
      <Separator />
      <SignOutButton className="self-start" />
    </SettingsShell>
  );
}
