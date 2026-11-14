import { CommunicationForm } from "@/client/features/account/settings-forms";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";
import { getMySettings } from "@/server/queries/account";

export const metadata = { title: "Communication preferences" };

/** Settings, Communication preferences: the marketing email tick (order emails are always sent). */
export default async function CommunicationPreferencesPage() {
  const user = await requireUserPage("/account/settings/communication-preferences");
  const settings = await getMySettings(user.id);
  return (
    <SettingsShell title="Communication preferences" mode="section">
      <CommunicationForm initial={settings.marketingOptIn} />
    </SettingsShell>
  );
}
