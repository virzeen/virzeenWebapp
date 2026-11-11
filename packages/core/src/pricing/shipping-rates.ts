import { KATHMANDU_VALLEY_DISTRICTS } from "@virzeen/validators";
import type { CustomerTier, ShippingZone } from "@virzeen/db";

// Delivery fees (owner decision 2026-11-11, specs/checkout-v2-week1.md; replaces "shipping folded into the
// price" of 2026-09-28). The fee depends on who is buying, not where: guests pay Rs. 200 and members Rs. 150, and
// delivery is free once the bag (after any discount code) reaches the tier's threshold. The pure rules live in
// @virzeen/validators/limits so the bag page shows the same hints.
export {
  DELIVERY_FEES,
  deliveryFeeFor,
  memberDeliverySaving,
  remainingForFreeDelivery,
} from "@virzeen/validators/limits";

/** Hours from the order until it leaves us (guests 48, MONO Members and Pass members 24). */
export const DISPATCH_HOURS: Record<CustomerTier, number> = { GUEST: 48, MEMBER: 24, PASS: 24 };

/** Days on the road after dispatch: same day in the Kathmandu Valley, 2 to 4 days elsewhere. */
export const TRANSIT_DAYS: Record<ShippingZone, { min: number; max: number }> = {
  KATHMANDU_VALLEY: { min: 0, max: 0 },
  OUTSIDE_VALLEY: { min: 2, max: 4 },
};

export function shippingZoneFor(district: string): ShippingZone {
  return KATHMANDU_VALLEY_DISTRICTS.includes(district) ? "KATHMANDU_VALLEY" : "OUTSIDE_VALLEY";
}

const NEPAL_OFFSET_MINUTES = 5 * 60 + 45;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function nepalDay(instant: Date, plusDays: number) {
  const shifted = new Date(instant.getTime() + NEPAL_OFFSET_MINUTES * 60_000);
  shifted.setUTCDate(shifted.getUTCDate() + plusDays);
  return { month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

/**
 * "Nov 17 to 19" (or one date when it is certain): the dispatch promise for the tier plus the days on the road, in
 * Nepal time. Worked on the server so the page doesn't change between server and browser.
 */
export function arrivalWindow(tier: CustomerTier, zone: ShippingZone, orderedAt: Date): string {
  const dispatchDays = DISPATCH_HOURS[tier] / 24;
  const { min, max } = TRANSIT_DAYS[zone];
  const first = nepalDay(orderedAt, dispatchDays + min);
  const last = nepalDay(orderedAt, dispatchDays + max);
  const a = `${MONTHS[first.month]} ${first.day}`;
  if (min === max) return a;
  return first.month === last.month ? `${a} to ${last.day}` : `${a} to ${MONTHS[last.month]} ${last.day}`;
}
