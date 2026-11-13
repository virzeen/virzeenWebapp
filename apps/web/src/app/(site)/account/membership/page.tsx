import { ButtonLink, MembershipCard, PremiumPanel } from "@virzeen/ui";
import { LEVEL_NAMES, THREE_HOUR_SMALL_PRINT } from "@virzeen/validators/membership";
import { LogoMark } from "@/client/components/layout/logo-mark";
import { Price } from "@/client/components/shared/price";
import { BenefitList } from "@/client/features/membership/benefit-list";
import { PassOffer } from "@/client/features/membership/pass-offer";
import { PerksGrid } from "@/client/features/membership/perks-grid";
import { WalletPanel } from "@/client/features/membership/wallet-panel";
import { formatDate, formatMonthYear } from "@/client/lib/format";
import { requireUserPage } from "@/server/auth/session";
import {
  getMyMembership,
  getMyPassSavings,
  getMyPerks,
  getMyReferral,
  getMyWallet,
} from "@/server/queries/account";

export const metadata = { title: "Membership" };

/** A Pass is shown as months left: one segment per month, up to a year. */
const SEGMENTS = Array.from({ length: 12 }, (_, month) => month + 1);

/**
 * The member's portal (specs/membership-portal.md). A Monochrome Pass member sees the black Pass hero with the card,
 * how long the Pass runs, what it has saved them and everything it includes; a free MONO Member sees their own
 * benefits and the Pass offer. Benefits that aren't built yet are marked "Soon" (the catalog's `live` list).
 */
export default async function MembershipPortalPage() {
  const user = await requireUserPage("/account/membership");
  const [membership, savings, wallet, perks, referral] = await Promise.all([
    getMyMembership(user.id),
    getMyPassSavings(user.id),
    getMyWallet(user.id),
    getMyPerks(user.id),
    getMyReferral(user.id),
  ]);
  const name = user.name.trim() || user.email;
  const firstName = user.name.trim().split(/\s+/)[0] ?? "";
  const isPass = membership.level === "PASS" && membership.passEndsAt !== null;

  if (!isPass) {
    return (
      <div className="flex flex-col gap-16 lg:gap-24">
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-h2 md:text-h1">Membership</h1>
          <WalletPanel {...wallet} />
        </div>
        <PerksGrid
          isPass={false}
          express={perks.express}
          birthdayMonth={perks.birthdayMonth}
          hasBirthday={perks.hasBirthday}
          referral={referral}
        />
        <PassOffer name={name} />
      </div>
    );
  }

  const endsAt = membership.passEndsAt as Date;
  const { daysLeft } = membership;
  const monthsLeft = Math.min(12, Math.ceil(daysLeft / 30));
  const startedAt = membership.passStartsAt ?? user.createdAt;

  return (
    <div className="flex flex-col gap-16 lg:gap-24">
      <PremiumPanel
        aria-labelledby="pass-hero-title"
        watermark={<LogoMark className="h-auto w-full" />}
        className="flex flex-col gap-10 p-8 lg:p-12"
      >
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <p className="text-caption tracking-widest text-canvas/70 uppercase">{LEVEL_NAMES.PASS}</p>
            <h1 id="pass-hero-title" className="font-display text-h1 leading-tight">
              {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
            </h1>
            <p className="text-body-lg text-canvas/80">
              Free delivery on every order, 10% off everything and Express Delivery in Kathmandu and Pokhara.
            </p>
            <div className="flex flex-col gap-3">
              <p className="text-small text-canvas/70" data-testid="pass-days-left">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left · valid until {formatDate(endsAt)}
              </p>
              <ol aria-label={`${monthsLeft} of 12 months left`} className="grid grid-cols-12 gap-1">
                {SEGMENTS.map((month) => (
                  <li
                    key={month}
                    aria-hidden
                    className={`h-1.5 rounded-full ${month <= monthsLeft ? "bg-canvas" : "bg-canvas/20"}`}
                  />
                ))}
              </ol>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/shop" shape="pill" variant="secondary" size="lg">
                Shop with your Pass
              </ButtonLink>
              <ButtonLink href="/membership" shape="pill" variant="secondary" size="lg">
                See every benefit
              </ButtonLink>
            </div>
          </div>
          <MembershipCard
            level="pass"
            name={name}
            title={LEVEL_NAMES.PASS}
            caption={`Valid until ${formatDate(endsAt)}`}
            logo={<LogoMark className="h-8 w-auto" />}
            role="img"
            aria-label="Your Monochrome Pass card"
            className="justify-self-center lg:justify-self-end"
          />
        </div>
      </PremiumPanel>

      <section aria-label="Your Pass at a glance">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
          <Stat label="Saved with your Pass" testId="pass-saved">
            <Price paisa={savings.savedPaisa} />
          </Stat>
          <Stat label="Pass orders" testId="pass-orders">
            {savings.orders}
          </Stat>
          <Stat label="Pass since">{formatMonthYear(startedAt)}</Stat>
          <Stat label="Months left">{monthsLeft}</Stat>
        </dl>
      </section>

      <WalletPanel {...wallet} isPass />

      <PerksGrid
        isPass
        express={perks.express}
        birthdayMonth={perks.birthdayMonth}
        hasBirthday={perks.hasBirthday}
        referral={referral}
      />

      <section aria-labelledby="pass-benefits" className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 id="pass-benefits" className="font-display text-h2">
            Everything your Pass includes
          </h2>
        </div>
        <BenefitList level="PASS" />
        <p className="text-small text-ink-muted">{THREE_HOUR_SMALL_PRINT}</p>
      </section>

      <section
        aria-labelledby="pass-care"
        className="flex flex-col items-start gap-4 rounded-xl border border-line p-8 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-col gap-2">
          <h2 id="pass-care" className="font-display text-h3">
            Priority support
          </h2>
          <p className="text-body text-ink-muted">
            Pass members go to the front of the line. Questions about an order, a return or styling: write to
            us and mention your Pass.
          </p>
        </div>
        <ButtonLink href="/contact" shape="pill" variant="secondary">
          Contact us
        </ButtonLink>
      </section>
    </div>
  );
}

function Stat({ label, testId, children }: { label: string; testId?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 bg-canvas p-6">
      <dt className="text-small text-ink-muted">{label}</dt>
      <dd className="font-display text-h2" data-testid={testId}>
        {children}
      </dd>
    </div>
  );
}
