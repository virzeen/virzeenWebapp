import { PaymentMethodForm } from "@/client/features/account/settings-forms";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";
import { getMySettings } from "@/server/queries/account";

export const metadata = { title: "Payment methods" };

/**
 * Settings, Payment methods (owner 2026-11-14): just "Cash on delivery", the one method offered at launch. Ticking it
 * saves at once, so there is no Save button. Virzeen keeps no card or wallet details.
 */
export default async function PaymentMethodsPage() {
  const user = await requireUserPage("/account/settings/payment-methods");
  const settings = await getMySettings(user.id);
  return (
    <SettingsShell title="Payment methods" mode="section">
      <PaymentMethodForm initial={settings.paymentMethod} />
    </SettingsShell>
  );
}
