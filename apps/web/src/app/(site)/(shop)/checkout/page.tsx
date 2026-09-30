import { Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/client/features/checkout/checkout-form";
import { getCartOwner, requireUserPage } from "@/server/auth/session";
import { features } from "@/server/env";
import { loadCheckout } from "@/server/queries/checkout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUserPage("/checkout");
  await getCartOwner(); // merges a guest bag into the account right after sign-in
  const data = await loadCheckout(user.id);
  if (!data) redirect("/cart?notice=empty");

  return (
    <Container className="flex flex-col gap-6 py-8 lg:gap-12 lg:py-12">
      <h1 className="text-center font-display text-h2">Checkout</h1>
      <CheckoutForm
        addresses={data.addresses}
        initialAddressId={data.defaultAddressId}
        initialTotals={data.totals}
        enabledMethods={{ COD: true, ESEWA: features.esewa, KHALTI: features.khalti }}
      />
    </Container>
  );
}
