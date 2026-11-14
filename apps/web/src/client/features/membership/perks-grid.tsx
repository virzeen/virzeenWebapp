import {
  BIRTHDAY_DISCOUNT_PERCENT,
  GIFT_WRAP_PAISA,
  REFERRAL_REWARD_PAISA,
} from "@virzeen/validators/limits";
import { Cake, Gift, Hourglass, Zap } from "lucide-react";
import { Fragment } from "react";
import { Link } from "@virzeen/ui";
import { Price } from "@/client/components/shared/price";
import { formatDateTime } from "@/client/lib/format";
import { BirthdayForm } from "./birthday-form";
import { PerkCard } from "./perk-card";
import { ReferralCard } from "./referral-card";

export type PerksGridProps = {
  isPass: boolean;
  express: { allowed: number; used: number; left: number };
  birthdayMonth: boolean;
  hasBirthday: boolean;
  /** Early access: the hours before the public the member sees new drops, and the drops waiting now. */
  early: { hours: number; items: { slug: string; name: string; publicAt: Date | null }[] };
  referral: {
    code: string;
    friends: number;
    earnedPaisa: number;
    invitedBy: { name: string } | null;
    canEnterCode: boolean;
  };
};

/**
 * The member's perks under the points card (specs/member-perks.md): Express Delivery left this month, the birthday
 * reward, gift wrapping and the referral code. The values follow the level (MONO Member or Pass).
 */
export function PerksGrid(props: PerksGridProps) {
  return (
    <section aria-label="Your perks" className="grid gap-4 sm:grid-cols-2" data-testid="perks-grid">
      {perkCards(props).map(({ id, node }) => (
        <Fragment key={id}>{node}</Fragment>
      ))}
    </section>
  );
}

/** The perk cards on their own, so the profile can lay them in a sideways row (the portal lays them in a grid). */
export function perkCards({
  isPass,
  express,
  birthdayMonth,
  hasBirthday,
  early,
  referral,
}: PerksGridProps): { id: string; node: React.ReactNode }[] {
  const tier = isPass ? "PASS" : "MEMBER";
  const slots = Array.from({ length: express.allowed }, (_, index) => index + 1);
  return [
    {
      id: "express",
      node: (
        <PerkCard
          testId="perk-express"
          icon={<Zap className="size-5 motion-safe:animate-shimmer" strokeWidth={1.5} />}
          title="Express Delivery"
          value={
            <span data-testid="express-left">
              {express.left} of {express.allowed} left
            </span>
          }
        >
          <ol aria-hidden className="flex gap-2">
            {slots.map((slot) => (
              <li
                key={slot}
                className={`h-1.5 flex-1 rounded-full ${slot <= express.left ? "bg-ink" : "bg-line"}`}
              />
            ))}
          </ol>
          <p className="text-small text-ink-muted">
            Within 3 hours in Kathmandu and Pokhara. Pick it at checkout.
          </p>
        </PerkCard>
      ),
    },
    {
      id: "birthday",
      node: (
        <PerkCard
          testId="perk-birthday"
          icon={<Cake className="size-5" strokeWidth={1.5} />}
          title="Birthday reward"
          value={`${BIRTHDAY_DISCOUNT_PERCENT[tier]}% off`}
        >
          {hasBirthday ? (
            <p className="text-small text-ink-muted" data-testid="birthday-state">
              {birthdayMonth
                ? "It is your birthday month. Applied at checkout."
                : "Applied in your birthday month."}
            </p>
          ) : (
            <>
              <p className="text-small text-ink-muted">Add your birthday to get it.</p>
              <BirthdayForm />
            </>
          )}
        </PerkCard>
      ),
    },
    {
      id: "early",
      node: (
        <PerkCard
          testId="perk-early"
          icon={<Hourglass className="size-5" strokeWidth={1.5} />}
          title="Early access"
          value={`${early.hours} hours early`}
        >
          {early.items.length > 0 ? (
            <ul className="flex flex-col gap-2" data-testid="early-items">
              {early.items.map((item) => (
                <li key={item.slug} className="flex flex-col text-small">
                  <Link href={`/product/${item.slug}`} variant="subtle" className="text-ink">
                    {item.name}
                  </Link>
                  {item.publicAt && (
                    <span className="text-ink-muted">Opens to everyone {formatDateTime(item.publicAt)}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-ink-muted">New drops open to you first.</p>
          )}
        </PerkCard>
      ),
    },
    {
      id: "gift-wrap",
      node: (
        <PerkCard
          testId="perk-gift-wrap"
          icon={<Gift className="size-5" strokeWidth={1.5} />}
          title="Gift wrapping"
          value={GIFT_WRAP_PAISA[tier] > 0 ? <Price paisa={GIFT_WRAP_PAISA[tier]} /> : "Free"}
        >
          <p className="text-small text-ink-muted">Add it at checkout.</p>
        </PerkCard>
      ),
    },
    {
      id: "referral",
      node: (
        <ReferralCard
          code={referral.code}
          rewardPaisa={REFERRAL_REWARD_PAISA[tier]}
          isPass={isPass}
          friends={referral.friends}
          earnedPaisa={referral.earnedPaisa}
          invitedBy={referral.invitedBy?.name ?? null}
          canEnterCode={referral.canEnterCode}
        />
      ),
    },
  ];
}
