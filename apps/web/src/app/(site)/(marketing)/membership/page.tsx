import { Button, ButtonLink, Container, MembershipCard, PremiumPanel } from "@virzeen/ui";
import {
  SHORT_POINTS,
  LEVEL_NAMES,
  PASS_PER_MONTH_PAISA,
  PASS_PLANS,
  THREE_HOUR_SMALL_PRINT,
  type MembershipLevel,
} from "@virzeen/validators/membership";

import type { Metadata } from "next";
import { LogoMark } from "@/client/components/layout/logo-mark";
import { Price } from "@/client/components/shared/price";
import { BenefitComparison } from "@/client/features/membership/benefit-comparison";
import { Bullet } from "@/client/features/membership/bullet";
import { BenefitText } from "@/client/features/membership/benefit-text";
import { getUser } from "@/server/auth/session";
import { getMyMembership } from "@/server/queries/account";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Shop as a guest, join MONO free for faster delivery and early access, or get the Monochrome Pass for free delivery and 10% off.",
  alternates: { canonical: "/membership" },
};

/**
 * The three levels (docs/specs/membership-portal.md): Guest, MONO Member (free) and the Monochrome Pass, with the
 * viewer's own level marked. The Pass is bought inside a MONO Member account; guests are asked to log in, and members
 * see that it opens soon (online payment).
 */
export default async function MembershipPage() {
  const user = await getUser();
  const level: MembershipLevel = user ? (await getMyMembership(user.id)).level : "GUEST";
  return (
    <Container className="flex flex-col gap-16 py-12 lg:gap-24 lg:py-20">
      <header className="flex flex-col gap-4 text-center">
        <p className="text-caption text-ink-muted uppercase">Membership</p>
        <h1 className="font-display text-h1">Shop your way</h1>
        <p className="mx-auto max-w-prose text-body-lg text-ink-muted">
          Browse as a guest, join MONO for free, or get the Monochrome Pass for the full experience.
        </p>
      </header>

      {/* Pricing-card layout (owner reference 2026-11-11): name, a small line, the price big, a black button, then short
          bullet points in two columns. Guest and MONO Member side by side; the Pass is the wide black card under
          them. The detail is in the table below, so the cards only carry a few words each. */}
      <section aria-label="The three levels" className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          {(["GUEST", "FREE"] as const).map((entry) => (
            <article
              key={entry}
              aria-labelledby={`level-${entry}`}
              data-current={entry === level || undefined}
              className="flex flex-col gap-6 rounded-xl border border-line bg-linear-to-br from-canvas to-surface p-8 shadow-sm"
            >
              <div className="flex flex-col gap-2">
                <h2 id={`level-${entry}`} className="font-display text-h2">
                  {LEVEL_NAMES[entry]}
                </h2>
                <p className="text-small text-ink-muted">
                  {entry === "GUEST"
                    ? "Shop freely, no account needed."
                    : "Your space in the Monochrome world."}
                </p>
              </div>
              <p className="flex items-baseline gap-2">
                <span className="font-display text-h1">Free</span>
                {entry === "FREE" && <span className="text-small text-ink-muted">to join</span>}
              </p>
              <LevelAction entry={entry} level={level} signedIn={Boolean(user)} />
              <ul className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-6">
                {SHORT_POINTS[entry].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-small whitespace-nowrap">
                    <Bullet />
                    <span>
                      <BenefitText text={point} />
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <PremiumPanel
          aria-labelledby="level-PASS"
          data-current={level === "PASS" || undefined}
          watermark={<LogoMark className="h-auto w-full" />}
          className="grid gap-8 lg:grid-cols-2 lg:gap-16"
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 id="level-PASS" className="font-display text-h2">
                {LEVEL_NAMES.PASS}
              </h2>
              <p className="text-small text-canvas/70">The full experience, for loyal customers.</p>
            </div>
            <div className="flex flex-col gap-2">
              <p className="flex items-baseline gap-2">
                <Price paisa={PASS_PER_MONTH_PAISA} className="font-display text-h1" />
                <span className="text-small text-canvas/70">/ month</span>
              </p>
              <p className="flex items-center gap-2 text-small text-canvas/70">
                <Price paisa={PASS_PLANS[0].pricePaisa} /> for 6 months
                <span aria-hidden>·</span>
                <Price paisa={PASS_PLANS[1].pricePaisa} /> for 1 year
              </p>
            </div>
            <LevelAction entry="PASS" level={level} signedIn={Boolean(user)} />
          </div>
          <ul className="grid grid-cols-1 content-center gap-3 sm:grid-cols-2">
            {SHORT_POINTS.PASS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-small whitespace-nowrap">
                <Bullet onDark />
                <span>
                  <BenefitText text={point} />
                </span>
              </li>
            ))}
          </ul>
        </PremiumPanel>
      </section>

      {level === "PASS" && user && (
        <section className="flex justify-center">
          <MembershipCard
            level="pass"
            name={user.name.trim() || user.email}
            title={LEVEL_NAMES.PASS}
            caption="Your Pass is active"
            logo={<LogoMark className="h-8 w-auto" />}
            role="img"
            aria-label="Your Monochrome Pass card"
          />
        </section>
      )}

      <section aria-labelledby="compare-heading" className="flex flex-col gap-8">
        <h2 id="compare-heading" className="font-display text-h2">
          Everything, side by side
        </h2>
        <BenefitComparison current={level} />
        <p className="text-small text-ink-muted">{THREE_HOUR_SMALL_PRINT}</p>
      </section>
    </Container>
  );
}

/** The call to action under a level's card, depending on who is looking. */
function LevelAction({
  entry,
  level,
  signedIn,
}: {
  entry: MembershipLevel;
  level: MembershipLevel;
  signedIn: boolean;
}) {
  const onPass = entry === "PASS";
  const variant = onPass ? "secondary" : "primary";
  if (entry === level) {
    return (
      <Button shape="pill" size="lg" variant={onPass ? "secondary" : "primary"} disabled className="w-full">
        Your level
      </Button>
    );
  }
  if (entry === "GUEST") {
    return (
      <ButtonLink href="/shop" shape="pill" size="lg" variant="secondary">
        Shop as a guest
      </ButtonLink>
    );
  }
  if (!signedIn) {
    return (
      <ButtonLink href="/login?next=%2Fmembership" shape="pill" size="lg" variant={variant}>
        {onPass ? "Log in to get the Pass" : "Log in or sign up"}
      </ButtonLink>
    );
  }
  if (onPass) {
    return (
      <Button shape="pill" size="lg" variant="secondary" disabled>
        Pass opens soon
      </Button>
    );
  }
  return null;
}
