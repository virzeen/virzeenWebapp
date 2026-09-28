import { KATHMANDU_VALLEY_DISTRICTS } from "@virzeen/validators";
import type { ShippingZone } from "@virzeen/db";

// Owner decision 2026-09-28: each product's shipping is included in its price (Product.shippingPaisa), so
// checkout charges nothing extra and shows "Free". Zones still decide the delivery-time promise.
export const SHIPPING_RATES_PAISA: Record<ShippingZone, number> = {
  KATHMANDU_VALLEY: 0,
  OUTSIDE_VALLEY: 0,
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
