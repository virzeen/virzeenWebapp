import { Separator } from "@virzeen/ui";
import { SignOutButton } from "@/client/components/shared/sign-out-button";
import { ProfileForm } from "@/client/features/account/profile-form";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUserPage("/account/settings");
  return (
    <SettingsShell title="Account details">
      <ProfileForm name={user.name} email={user.email} />
      <Separator />
      <SignOutButton className="self-start" />
    </SettingsShell>
  );
}
