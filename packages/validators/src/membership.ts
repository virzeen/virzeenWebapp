// The three customer levels and what each gets (docs/Monochrome Membership & Store Features — Implementation Guide.md,
// docs/specs/membership-portal.md). Plain data, no zod, so the account pages and the public Membership page share one
// list and the browser bundle stays small. Amounts in the text are written `{p:15000}` (paisa) and drawn with <Price>.
// `live` says which levels really get the benefit today; the rest show "Soon" until that part is built.

export type MembershipLevel = "GUEST" | "FREE" | "PASS";

export const LEVEL_NAMES: Record<MembershipLevel, string> = {
  GUEST: "Guest",
  FREE: "MONO Member",
  PASS: "Monochrome Pass",
};

/** The Pass plans (owner 2026-11-11: Rs 2,999 for 6 months, Rs 4,599 for a year). */
export const PASS_PLANS = [
  { months: 6, pricePaisa: 299_900, label: "6 months" },
  { months: 12, pricePaisa: 459_900, label: "1 year" },
] as const;

/**
 * The Pass is shown as Rs 499 a month (owner 2026-11-11) but sold only as 6 months or a year, never month to month.
 * Display only: the charge is a plan's `pricePaisa`.
 */
export const PASS_PER_MONTH_PAISA = 49_900;

export type BenefitGroup =
  | "Delivery and dispatch"
  | "Savings and rewards"
  | "New collections and stock"
  | "Gifts and occasions"
  | "Service, styling and returns"
  | "Community and account";

export type Benefit = {
  id: string;
  group: BenefitGroup;
  label: string;
  /** What each level gets; null means the level doesn't get it. */
  guest: string | null;
  free: string | null;
  pass: string | null;
  /** The levels for which this works today. */
  live: readonly MembershipLevel[];
};

export const BENEFIT_GROUPS: readonly BenefitGroup[] = [
  "Delivery and dispatch",
  "Savings and rewards",
  "New collections and stock",
  "Gifts and occasions",
  "Service, styling and returns",
  "Community and account",
];

export const BENEFITS: readonly Benefit[] = [
  {
    id: "delivery-fee",
    group: "Delivery and dispatch",
    label: "Delivery fee",
    guest: "{p:20000}",
    free: "{p:15000}",
    pass: "Free, no minimum",
    live: ["GUEST", "FREE"],
  },
  {
    id: "free-delivery-from",
    group: "Delivery and dispatch",
    label: "Free delivery on orders from",
    guest: "{p:999900}",
    free: "{p:300000}",
    pass: "Every order",
    live: ["GUEST", "FREE"],
  },
  {
    id: "dispatch",
    group: "Delivery and dispatch",
    label: "Dispatch time",
    guest: "Within 48 hours",
    free: "Within 24 hours",
    pass: "Within 24 hours",
    live: ["GUEST", "FREE"],
  },
  {
    id: "missed-dispatch",
    group: "Delivery and dispatch",
    label: "Missed dispatch promise",
    guest: null,
    free: null,
    pass: "{p:10000} credit automatically",
    live: [],
  },
  {
    id: "express",
    group: "Delivery and dispatch",
    label: "Express Delivery",
    guest: null,
    free: "Within 3 hours, in Kathmandu and Pokhara only, 1 time a month",
    pass: "Within 3 hours, in Kathmandu and Pokhara only, 3 times a month",
    live: [],
  },
  {
    id: "priority-packing",
    group: "Delivery and dispatch",
    label: "Priority packing",
    guest: null,
    free: null,
    pass: "Packed first",
    live: [],
  },
  {
    id: "time-slot",
    group: "Delivery and dispatch",
    label: "Choose a delivery time slot",
    guest: null,
    free: null,
    pass: "Morning, afternoon or evening",
    live: [],
  },
  {
    id: "gift-address",
    group: "Delivery and dispatch",
    label: "Free delivery to a second address (gift)",
    guest: null,
    free: null,
    pass: "Included",
    live: [],
  },
  {
    id: "cancel",
    group: "Delivery and dispatch",
    label: "Cancel before dispatch",
    guest: "Included",
    free: "Included",
    pass: "Included, instant refund to wallet",
    live: ["GUEST", "FREE", "PASS"],
  },
  {
    id: "cod",
    group: "Delivery and dispatch",
    label: "Cash on delivery",
    guest: "Included",
    free: "Included",
    pass: "Included",
    live: ["GUEST", "FREE", "PASS"],
  },

  {
    id: "discount",
    group: "Savings and rewards",
    label: "Discount on all products",
    guest: null,
    free: null,
    pass: "10%",
    live: [],
  },
  {
    id: "bundle",
    group: "Savings and rewards",
    label: "Extra discount on complete looks",
    guest: null,
    free: null,
    pass: "Extra 5%",
    live: [],
  },
  {
    id: "points",
    group: "Savings and rewards",
    label: "Points on purchases",
    guest: null,
    free: "1 point per {p:120000}",
    pass: "2 points per {p:120000}",
    live: [],
  },
  {
    id: "points-expiry",
    group: "Savings and rewards",
    label: "Points expiry",
    guest: null,
    free: "12 months",
    pass: "Never expire",
    live: [],
  },
  {
    id: "double-points",
    group: "Savings and rewards",
    label: "Double points days",
    guest: null,
    free: null,
    pass: "1 day every month",
    live: [],
  },
  {
    id: "flash-sale",
    group: "Savings and rewards",
    label: "Member-only flash sale",
    guest: null,
    free: null,
    pass: "Once a month, 24 hours",
    live: [],
  },
  {
    id: "festival",
    group: "Savings and rewards",
    label: "Festival sales (Dashain, Tihar, New Year)",
    guest: "Public sale",
    free: "Early access",
    pass: "Early access and an extra member discount",
    live: [],
  },
  {
    id: "price-lock",
    group: "Savings and rewards",
    label: "Price lock during sales",
    guest: null,
    free: null,
    pass: "Sale price held 24 hours after the sale ends",
    live: [],
  },

  {
    id: "early-access",
    group: "New collections and stock",
    label: "Early access to new drops",
    guest: null,
    free: "12 hours early",
    pass: "48 hours early",
    live: [],
  },
  {
    id: "members-only",
    group: "New collections and stock",
    label: "Member-only products and limited editions",
    guest: null,
    free: null,
    pass: "Included",
    live: [],
  },
  {
    id: "pre-order",
    group: "New collections and stock",
    label: "Pre-order upcoming pieces",
    guest: null,
    free: null,
    pass: "Before public listing",
    live: [],
  },
  {
    id: "back-in-stock",
    group: "New collections and stock",
    label: "Back-in-stock alerts",
    guest: null,
    free: "Included",
    pass: "Included, item held for 24 hours",
    live: ["FREE", "PASS"],
  },
  {
    id: "reserve",
    group: "New collections and stock",
    label: "Reserve items before buying",
    guest: null,
    free: null,
    pass: "Up to 3 items for 3 days",
    live: [],
  },
  {
    id: "vote",
    group: "New collections and stock",
    label: "Vote on the next collection",
    guest: null,
    free: null,
    pass: "Included",
    live: [],
  },

  {
    id: "gift-wrap",
    group: "Gifts and occasions",
    label: "Gift wrapping",
    guest: "{p:15000}",
    free: "{p:10000}",
    pass: "Free",
    live: [],
  },
  {
    id: "birthday",
    group: "Gifts and occasions",
    label: "Birthday reward",
    guest: null,
    free: "5% coupon",
    pass: "Small gift and 15% off for the birthday month",
    live: [],
  },
  {
    id: "anniversary",
    group: "Gifts and occasions",
    label: "Membership anniversary gift",
    guest: null,
    free: null,
    pass: "Every year",
    live: [],
  },

  {
    id: "support",
    group: "Service, styling and returns",
    label: "Customer support",
    guest: "Normal",
    free: "Normal",
    pass: "Priority line",
    live: [],
  },
  {
    id: "return-window",
    group: "Service, styling and returns",
    label: "Return window",
    guest: "7 days",
    free: "7 days",
    pass: "15 days",
    live: ["GUEST", "FREE"],
  },
  {
    id: "return-pickup",
    group: "Service, styling and returns",
    label: "Return pickup",
    guest: "Customer pays",
    free: "Customer pays",
    pass: "Free pickup",
    live: ["GUEST", "FREE"],
  },
  {
    id: "size-exchange",
    group: "Service, styling and returns",
    label: "Clothing size exchange",
    guest: "Customer pays delivery",
    free: "Customer pays delivery",
    pass: "Free with pickup",
    live: [],
  },
  {
    id: "replacement",
    group: "Service, styling and returns",
    label: "Order exchange or replacement",
    guest: "Included",
    free: "Included",
    pass: "Included, sent the same day",
    live: [],
  },
  {
    id: "history",
    group: "Service, styling and returns",
    label: "Order history and quick reorder",
    guest: null,
    free: "Included",
    pass: "Included",
    live: ["FREE", "PASS"],
  },
  {
    id: "favourites",
    group: "Service, styling and returns",
    label: "Favourites",
    guest: null,
    free: "Included",
    pass: "Included",
    live: ["FREE", "PASS"],
  },

  {
    id: "referral",
    group: "Community and account",
    label: "Refer a friend",
    guest: null,
    free: "{p:20000} credit after your friend's first order",
    pass: "{p:30000} credit, and your friend gets 1 month of the Pass free",
    live: [],
  },
  {
    id: "pause",
    group: "Community and account",
    label: "Pause membership",
    guest: null,
    free: null,
    pass: "Up to 1 month a year",
    live: [],
  },
];

/**
 * Short points for the Membership page's cards (the full detail is in the table under them): a few words each, so the
 * cards don't repeat the table.
 */
export const SHORT_POINTS: Record<MembershipLevel, readonly string[]> = {
  GUEST: ["Delivery {p:20000}", "Free from {p:999900}", "Ships in 48 hours", "7-day returns"],
  FREE: [
    "Delivery {p:15000}",
    "Free from {p:300000}",
    "Ships in 24 hours",
    "7-day returns",
    "Early access",
    "Birthday coupon",
    "Express Delivery",
    "Refer a friend",
  ],
  PASS: [
    "Free delivery",
    "10% off everything",
    "Express Delivery",
    "48h early access",
    "Member-only pieces",
    "Free gift wrap",
    "15-day returns",
    "Free pickup",
    "Priority support",
    "Pause anytime",
  ],
};

/** The headline lines per level (the Membership page cards and the portals). */
export const HEADLINES: Record<MembershipLevel, readonly string[]> = {
  GUEST: [
    "Delivery {p:20000}, free from {p:999900}",
    "Ships within 48 hours",
    "7-day returns and breakage replacement",
  ],
  FREE: [
    "Delivery {p:15000}, free from {p:300000}",
    "Ships within 24 hours",
    "Express Delivery within 3 hours in Kathmandu and Pokhara, 1 time a month",
    "12-hour early access to new drops and festival sales",
    "1 point for every {p:120000}, plus a 5% birthday coupon",
    "7-day returns, favourites and one-tap reorder",
    "Refer a friend: get {p:20000} credit when their first order is delivered",
  ],
  PASS: [
    "Free delivery on every order, no minimum",
    "Express Delivery within 3 hours in Kathmandu and Pokhara, 3 times a month",
    "10% off everything, extra 5% on complete looks",
    "2 points per {p:120000}, never expiring, plus double points days",
    "48-hour early access, member-only pieces and pre-orders",
    "Monthly member-only flash sale and a free gift on every 5th order",
    "Free gift wrapping",
    "Birthday gift and 15% off, an anniversary gift every year",
    "15-day returns with free pickup, free size exchange",
    "Priority WhatsApp support",
    "Pause up to a month a year",
  ],
};

export const THREE_HOUR_SMALL_PRINT =
  "Express Delivery applies to ready-stock items confirmed 9 AM to 6 PM. Orders after 6 PM ship by 11 AM the next day. Excludes public holidays.";

/** The level of a member: the Pass while it runs, otherwise a free MONO Member. */
export function levelOf(passEndsAt: Date | null | undefined, now: Date = new Date()): "FREE" | "PASS" {
  return passEndsAt && passEndsAt.getTime() > now.getTime() ? "PASS" : "FREE";
}
