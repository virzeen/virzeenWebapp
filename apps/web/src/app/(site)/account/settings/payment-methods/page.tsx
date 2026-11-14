import { ButtonLink } from "@virzeen/ui";
import { SettingsShell } from "@/client/features/account/settings-shell";
import { requireUserPage } from "@/server/auth/session";

export const metadata = { title: "Payment methods" };

/**
 * Settings, Payment methods (specs/member-area-nike-layout.md). Virzeen keeps no card or wallet details, so there is
 * nothing to add or remove: the page says how to pay and points to the payment options.
 */
export default async function PaymentMethodsPage() {
  await requireUserPage("/account/settings/payment-methods");
  return (
    <SettingsShell title="Saved payment methods" mode="section">
      <p className="text-body">
        Virzeen doesn&apos;t save your card or wallet details. You choose how to pay each time at checkout.
      </p>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {["Cash on delivery", "eSewa", "Khalti"].map((method) => (
          <li key={method} className="py-3 text-body">
            {method}
          </li>
        ))}
      </ul>
      <ButtonLink href="/shipping" shape="pill" className="self-start">
        Payment options
      </ButtonLink>
    </SettingsShell>
  );
}
