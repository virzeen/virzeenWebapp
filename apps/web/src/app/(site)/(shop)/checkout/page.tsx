import { DELIVERY_FEES } from "@virzeen/core";
import { Container } from "@virzeen/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatPaisa } from "@/client/components/shared/price";
import { CheckoutChoice } from "@/client/features/checkout/checkout-choice";
import { CheckoutForm } from "@/client/features/checkout/checkout-form";
import { getCartOwner, getUser } from "@/server/auth/session";
import { features } from "@/server/env";
import { loadCheckout } from "@/server/queries/checkout";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/**
 * /checkout (docs/specs/checkout-v2-week1.md). Signed-out visitors with a bag choose Member or Guest; members go
 * straight to Delivery. `?as=guest` opens the guest's delivery step.
 */
export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getUser();
  const owner = await getCartOwner(); // merges a guest bag into the account right after sign-in
  if (!owner) redirect("/cart?notice=empty");
  const data = await loadCheckout(owner);
  if (!data) redirect("/cart?notice=empty");
  const asGuest = flattenSearchParams(await searchParams).as === "guest";

  if (!user && !asGuest) {
    return (
      <Container className="py-8 lg:py-12">
        <CheckoutChoice memberFreeFrom={formatPaisa(DELIVERY_FEES.MEMBER.freeFromPaisa)} />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-8 lg:gap-12 lg:py-12">
      <h1 className="text-center font-display text-h2">Checkout</h1>
      <CheckoutForm
        mode={user ? "member" : "guest"}
        addresses={data.addresses}
        initialAddressId={data.defaultAddressId}
        initialTotals={data.totals}
        enabledMethods={{ COD: true, ESEWA: features.esewa, KHALTI: features.khalti }}
        {...(user ? { memberEmail: user.email } : {})}
      />
    </Container>
  );
}
