import { KATHMANDU_VALLEY_DISTRICTS } from "@virzeen/validators";
import type { ShippingZone } from "@virzeen/db";

// ◆ OWNER DECISION PENDING (docs/STATUS.md): placeholder flat rates per zone (payment-policy.md §2).
export const SHIPPING_RATES_PAISA: Record<ShippingZone, number> = {
  KATHMANDU_VALLEY: 10_000, // Rs 100
  OUTSIDE_VALLEY: 20_000, // Rs 200
};

// ◆ OWNER DECISION PENDING: delivery-time promises shown to customers.
export const DELIVERY_ESTIMATES: Record<ShippingZone, string> = {
  KATHMANDU_VALLEY: "1–3 days",
  OUTSIDE_VALLEY: "3–7 days",
};

export function shippingZoneFor(district: string): ShippingZone {
  return KATHMANDU_VALLEY_DISTRICTS.includes(district) ? "KATHMANDU_VALLEY" : "OUTSIDE_VALLEY";
}

export function shippingFor(zone: ShippingZone): number {
  return SHIPPING_RATES_PAISA[zone];
}
