import { memberService } from "@virzeen/core";
import { Separator } from "@virzeen/ui";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/client/components/shared/sign-out-button";
import { PasswordForm } from "@/client/features/account/password-form";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";

export const metadata = { title: "Password" };

/** Settings → Password: set one, or change it. Admins sign in with a code and the authenticator, so no password. */
export default async function PasswordSettingsPage() {
  const user = await requireUserPage("/account/settings/password");
  if (user.role === "ADMIN") redirect("/account/settings");
  const hasPassword = await memberService.hasPassword(user.id);
  return (
    <SettingsShell title="Password" mode="section">
      <PasswordForm hasPassword={hasPassword} />
      <Separator />
      <SignOutButton className="self-start" />
    </SettingsShell>
  );
}
