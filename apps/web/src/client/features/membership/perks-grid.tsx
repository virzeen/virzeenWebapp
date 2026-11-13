import {
  BIRTHDAY_DISCOUNT_PERCENT,
  GIFT_WRAP_PAISA,
  REFERRAL_REWARD_PAISA,
} from "@virzeen/validators/limits";
import { Cake, Gift, Zap } from "lucide-react";
import { Price } from "@/client/components/shared/price";
import { BirthdayForm } from "./birthday-form";
import { PerkCard } from "./perk-card";
import { ReferralCard } from "./referral-card";

type PerksGridProps = {
  isPass: boolean;
  express: { allowed: number; used: number; left: number };
  birthdayMonth: boolean;
  hasBirthday: boolean;
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
export function PerksGrid({ isPass, express, birthdayMonth, hasBirthday, referral }: PerksGridProps) {
  const tier = isPass ? "PASS" : "MEMBER";
  const slots = Array.from({ length: express.allowed }, (_, index) => index + 1);
  return (
    <section aria-label="Your perks" className="grid gap-4 sm:grid-cols-2" data-testid="perks-grid">
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

      <PerkCard
        testId="perk-gift-wrap"
        icon={<Gift className="size-5" strokeWidth={1.5} />}
        title="Gift wrapping"
        value={GIFT_WRAP_PAISA[tier] > 0 ? <Price paisa={GIFT_WRAP_PAISA[tier]} /> : "Free"}
      >
        <p className="text-small text-ink-muted">Add it at checkout.</p>
      </PerkCard>

      <ReferralCard
        code={referral.code}
        rewardPaisa={REFERRAL_REWARD_PAISA[tier]}
        isPass={isPass}
        friends={referral.friends}
        earnedPaisa={referral.earnedPaisa}
        invitedBy={referral.invitedBy?.name ?? null}
        canEnterCode={referral.canEnterCode}
      />
    </section>
  );
}
