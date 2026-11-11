import { Button, MembershipCard } from "@virzeen/ui";
import { PASS_PER_MONTH_PAISA, PASS_PLANS, SHORT_POINTS } from "@virzeen/validators/membership";
import { LogoMark } from "@/client/components/layout/logo-mark";
import { Price } from "@/client/components/shared/price";
import { BenefitText } from "./benefit-text";
import { Bullet } from "./bullet";

/**
 * The Monochrome Pass offer shown to a free MONO Member: the black card, the headline benefits and the two plans. The
 * Pass can't be bought yet (it opens with online payment, specs/membership-portal.md), so the button is off and says so.
 */
export function PassOffer({ name }: { name: string }) {
  return (
    <section aria-labelledby="pass-offer-heading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 id="pass-offer-heading" className="font-display text-h2">
          The Monochrome Pass
        </h2>
        <p className="text-body-lg text-ink-muted">Free delivery. 10% off. Ready in 3 hours.</p>
      </div>
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <MembershipCard
          level="pass"
          name={name}
          title="Monochrome Pass"
          caption="Your card, once you join"
          logo={<LogoMark className="h-8 w-auto" />}
          role="img"
          aria-label="Monochrome Pass card"
        />
        <div className="flex flex-col gap-6">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
            {SHORT_POINTS.PASS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-body">
                <Bullet />
                <span>
                  <BenefitText text={point} />
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-baseline gap-2">
            <Price paisa={PASS_PER_MONTH_PAISA} className="font-display text-h1" />
            <span className="text-small text-ink-muted">/ month</span>
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {PASS_PLANS.map((plan) => (
              <li key={plan.months} className="flex flex-col gap-1 rounded-md border border-line p-4">
                <span className="text-small text-ink-muted">{plan.label}</span>
                <Price paisa={plan.pricePaisa} className="text-h3" />
              </li>
            ))}
          </ul>
          <Button shape="pill" size="lg" disabled className="w-full">
            Pass opens soon
          </Button>
          <p className="text-small text-ink-muted">
            Bought for 6 months or 1 year, never month to month. The Pass is bought inside your MONO Member
            account, with online payment, and opens soon.
          </p>
        </div>
      </div>
    </section>
  );
}
