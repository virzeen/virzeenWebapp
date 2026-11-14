import "server-only";
import "@/server/bootstrap";
import { addressService, cartService, checkoutService, orderService, type CartOwner } from "@virzeen/core";
import { hasGuestOrderAccess } from "@/server/auth/guest-order";

/**
 * Everything the checkout page needs: a signed-in member (saved addresses, member rate) or a guest (typed address,
 * guest rate). Returns null when the bag is empty.
 */
export async function loadCheckout(owner: CartOwner) {
  const cart = await cartService.getSummary(owner);
  if (cart.items.filter((item) => item.isAvailable).length === 0) return null;
  const userId = "userId" in owner ? owner.userId : null;
  const addresses = userId ? await addressService.list(userId) : [];
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const totals = await checkoutService.preview({
    userId,
    cartId: cart.id,
    addressId: defaultAddress?.id ?? null,
  });
  return { addresses, defaultAddressId: defaultAddress?.id ?? null, totals };
}

/** A guest's order, only after the signed cookie for exactly this order was checked. Anything else → null (404). */
export async function getGuestOrder(orderNumber: string) {
  if (!(await hasGuestOrderAccess(orderNumber))) return null;
  try {
    return await orderService.getForGuest(orderNumber);
  } catch {
    return null;
  }
}
