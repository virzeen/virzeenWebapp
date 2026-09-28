import "server-only";
import "@/server/bootstrap";
import { addressService, cartService, checkoutService } from "@virzeen/core";

/** Everything the checkout page needs for a signed-in customer. Returns null when the bag is empty. */
export async function loadCheckout(userId: string) {
  const cart = await cartService.getSummary({ userId });
  if (cart.items.filter((item) => item.isAvailable).length === 0) return null;
  const addresses = await addressService.list(userId);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const totals = await checkoutService.preview({
    userId,
    cartId: cart.id,
    addressId: defaultAddress?.id ?? null,
  });
  return { addresses, defaultAddressId: defaultAddress?.id ?? null, totals };
}
