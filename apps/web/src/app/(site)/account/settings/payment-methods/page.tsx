import { ButtonLink } from "@virzeen/ui";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";

export const metadata = { title: "Payment methods" };

/**
 * Settings, Payment methods, like Nike's empty one (specs/member-area-nike-layout.md): the title and a black
 * "Payment options" pill. Virzeen keeps no card or wallet details, so there is nothing to add or remove.
 */
export default async function PaymentMethodsPage() {
  await requireUserPage("/account/settings/payment-methods");
  return (
    <SettingsShell title="Saved payment methods" mode="section">
      <ButtonLink href="/shipping" shape="pill" className="self-start">
        Payment options
      </ButtonLink>
    </SettingsShell>
  );
}
