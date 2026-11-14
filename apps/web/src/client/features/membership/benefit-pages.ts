import {
  BIRTHDAY_DISCOUNT_PERCENT,
  EARLY_ACCESS_HOURS,
  EXPRESS_PER_MONTH,
  GIFT_WRAP_PAISA,
  POINT_EARN_UNIT_PAISA,
  POINTS_EXPIRY_DAYS,
  POINTS_MAX_SHARE_PERCENT,
  REFERRAL_FRIEND_PASS_MONTHS,
  REFERRAL_REWARD_PAISA,
} from "@virzeen/validators/limits";
import { formatPaisa } from "@/client/components/shared/price";

// The member benefit pages and the cards that open them (docs/specs/member-benefit-pages.md). One place for the copy
// and the pictures; the amounts come from the same limits the checkout uses.

/** Rupees from paisa, for sentences ("Rs 200"). */
const rs = formatPaisa;

/**
 * A picture slot. Until real photos are added these are crops of the brand picture: `position` picks which part of
 * the wide picture stays in a tall or square card.
 */
export type BenefitPicture = {
  src: string;
  alt: string;
  position: "object-left" | "object-center" | "object-right";
};

/** The perk card on the Membership portal that a benefit page shows to members (see `perkCards`). */
export type PerkId = "express" | "birthday" | "early" | "gift-wrap" | "referral";

export type BenefitPage = {
  slug: string;
  title: string;
  /** Two or three sentences under the h1. */
  intro: string;
  feature: {
    title: string;
    text: string;
    cta: { label: string; href: string };
  };
  /** The card's picture and the page's top picture. */
  card: BenefitPicture;
  hero: BenefitPicture;
  /** The picture beside the feature text. */
  featurePicture: BenefitPicture;
  /** The live card shown to a signed-in member on the page. */
  perk?: PerkId;
};

const HERO = "/brand/hero-1600.webp";

export const BENEFIT_PAGES: readonly BenefitPage[] = [
  {
    slug: "express-delivery",
    title: "Express Delivery",
    intro: `Order between 9 AM and 6 PM Nepal time and we pack and hand it over to the courier within 3 hours in Kathmandu Valley and Pokhara. Order later and it leaves by 11 AM the next day. MONO Members get ${EXPRESS_PER_MONTH.MEMBER} Express Delivery a month, the Monochrome Pass ${EXPRESS_PER_MONTH.PASS}. There is no fee.`,
    feature: {
      title: "Pick it at checkout",
      text: "Choose Express Delivery next to the delivery address. Your count resets on the 1st of every month.",
      cta: { label: "Shop", href: "/shop" },
    },
    card: {
      src: "/brand/benefits/express-delivery.jpg",
      alt: "A cardboard parcel with a blank label",
      position: "object-center",
    },
    hero: {
      src: "/brand/benefits/express-delivery.jpg",
      alt: "A cardboard parcel with a blank label",
      position: "object-center",
    },
    featurePicture: {
      src: "/brand/benefits/city-walk.jpg",
      alt: "Two people walking down a city street",
      position: "object-center",
    },
    perk: "express",
  },
  {
    slug: "birthday-reward",
    title: "Birthday reward",
    intro: `In your birthday month your order is ${BIRTHDAY_DISCOUNT_PERCENT.MEMBER}% off, or ${BIRTHDAY_DISCOUNT_PERCENT.PASS}% off with the Monochrome Pass. It is applied for you at checkout; there is no code to type.`,
    feature: {
      title: "Tell us your birthday",
      text: "Add your birthday once and the reward turns on in that month every year. Only the day and month are used.",
      cta: { label: "Shop", href: "/shop" },
    },
    card: { src: HERO, alt: "White and black flowers in a vase", position: "object-left" },
    hero: { src: HERO, alt: "White and black flowers in a vase", position: "object-left" },
    featurePicture: { src: HERO, alt: "White and black flowers in a vase", position: "object-left" },
    perk: "birthday",
  },
  {
    slug: "early-access",
    title: "Early access",
    intro: `New drops and festival collections open to members first: ${EARLY_ACCESS_HOURS.MEMBER} hours before the public as a MONO Member, ${EARLY_ACCESS_HOURS.PASS} hours with the Monochrome Pass.`,
    feature: {
      title: "First in line",
      text: "Anything waiting for you appears in the shop as soon as it opens to you. What is coming next is listed below.",
      cta: { label: "Shop", href: "/shop" },
    },
    card: {
      src: "/brand/benefits/early-access.jpg",
      alt: "White hangers on a clothes rail",
      position: "object-center",
    },
    hero: {
      src: "/brand/benefits/early-access.jpg",
      alt: "White hangers on a clothes rail",
      position: "object-center",
    },
    featurePicture: { src: HERO, alt: "A man reading in a quiet room", position: "object-center" },
    perk: "early",
  },
  {
    slug: "gift-wrapping",
    title: "Gift wrapping",
    intro: `Send an order as a gift. Gift wrapping is ${rs(GIFT_WRAP_PAISA.MEMBER)} for a MONO Member and free with the Monochrome Pass.`,
    feature: {
      title: "Add it at checkout",
      text: "Tick gift wrapping when you place the order. We pack it in our own box and leave the price off the parcel.",
      cta: { label: "Shop", href: "/shop" },
    },
    card: { src: HERO, alt: "Books and bowls on a dark shelf", position: "object-center" },
    hero: { src: HERO, alt: "Books and bowls on a dark shelf", position: "object-center" },
    featurePicture: { src: HERO, alt: "A white shirt on a clothes rail", position: "object-right" },
    perk: "gift-wrap",
  },
  {
    slug: "refer-a-friend",
    title: "Refer a friend",
    intro: `Share your code. When your friend's first order is delivered you get ${rs(REFERRAL_REWARD_PAISA.MEMBER)} credit, or ${rs(REFERRAL_REWARD_PAISA.PASS)} with the Monochrome Pass, and a Pass member's friend gets ${REFERRAL_FRIEND_PASS_MONTHS} month of the Pass.`,
    feature: {
      title: "Your code is yours",
      text: "A friend adds it before their first order. If that order is returned, the reward is taken back.",
      cta: { label: "Shop", href: "/shop" },
    },
    card: {
      src: "/brand/benefits/refer-a-friend.jpg",
      alt: "Two friends walking arm in arm down a street",
      position: "object-center",
    },
    hero: {
      src: "/brand/benefits/refer-a-friend.jpg",
      alt: "Two friends walking arm in arm down a street",
      position: "object-center",
    },
    featurePicture: {
      src: "/brand/benefits/refer-a-friend-walk.jpg",
      alt: "Two people walking down a sunny street",
      position: "object-center",
    },
    perk: "referral",
  },
  {
    slug: "points",
    title: "Points",
    intro: `MONO Members earn 1 point for every ${rs(POINT_EARN_UNIT_PAISA)} they spend, the Monochrome Pass 2. A point is worth Rs 1 at checkout, up to ${POINTS_MAX_SHARE_PERCENT}% of the products. Points arrive when an order is delivered. A MONO Member's last ${Math.round(POINTS_EXPIRY_DAYS / 30)} months; a Pass member's never expire.`,
    feature: {
      title: "Your points are on your profile",
      text: "See what you have, what they are worth and when the soonest ones expire.",
      cta: { label: "See your points", href: "/account" },
    },
    card: { src: HERO, alt: "A man reading in a quiet room", position: "object-center" },
    hero: { src: HERO, alt: "A man reading in a quiet room", position: "object-center" },
    featurePicture: { src: HERO, alt: "Books and bowls on a dark shelf", position: "object-center" },
  },
] as const;

export function getBenefitPage(slug: string): BenefitPage | undefined {
  return BENEFIT_PAGES.find((page) => page.slug === slug);
}
