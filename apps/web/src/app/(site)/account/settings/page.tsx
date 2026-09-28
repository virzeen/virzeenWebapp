import { SettingsForm } from "@/client/features/account/settings-form";
import { requireUserPage } from "@/server/auth/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUserPage("/account/settings");
  return <SettingsForm name={user.name} email={user.email} />;
}
