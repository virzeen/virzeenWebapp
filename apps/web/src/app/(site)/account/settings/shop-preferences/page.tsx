import { SettingsShell } from "@/client/features/account/settings-shell";
import { ShopPreferencesForm } from "@/client/features/account/settings-forms";
import { requireUserPage } from "@/server/auth/session";
import { getMySettings } from "@/server/queries/account";

export const metadata = { title: "Shop preferences" };

/** Settings, Shop preferences: what they shop for, their clothing size and the unit of measure. */
export default async function ShopPreferencesPage() {
  const user = await requireUserPage("/account/settings/shop-preferences");
  const settings = await getMySettings(user.id);
  return (
    <SettingsShell title="Shop preferences" mode="section">
      <ShopPreferencesForm
        initial={{ preference: settings.preference ?? "BOTH", size: settings.size, unit: settings.unit }}
      />
    </SettingsShell>
  );
}
