import { ButtonLink } from "@virzeen/ui";
import { LogoMark } from "@/client/components/layout/logo-mark";
import { Wordmark } from "@/client/components/layout/wordmark";

type CheckoutChoiceProps = {
  /** "Rs 3,000": the member free-delivery line, from the server's delivery rules. */
  memberFreeFrom: string;
};

const PERKS = [
  ["I", "Early access to new drops"],
  ["II", "Points on every order"],
  ["III", "A reward on your birthday"],
] as const;

/**
 * The two ways to check out (docs/checkoutfeatures.md §3.1). Guest is a plain card. The MONO Member panel is a
 * membership pass: an ink card with a hairline frame inside it, the wordmark, roman-numeral perks and the V mark
 * as a watermark. It uses tokens only (ink, canvas at fixed opacities), no gradient and no shadow.
 * On phones the Member panel comes first.
 */
export function CheckoutChoice({ memberFreeFrom }: CheckoutChoiceProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <h1 className="text-center font-display text-h2">Choose how you would like to check out</h1>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-stretch">
        <section
          aria-labelledby="member-heading"
          className="relative isolate overflow-hidden rounded-md bg-ink p-2 text-canvas"
          data-testid="member-panel"
        >
          <LogoMark className="pointer-events-none absolute inset-x-8 -bottom-8 -z-10 text-canvas/5" />
          <div className="flex h-full flex-col gap-8 rounded-sm border border-canvas/30 p-8">
            <div className="flex items-center justify-between gap-4">
              <Wordmark className="h-6 w-auto" title="Virzeen" />
              <p className="text-caption text-canvas/70">MONO Member</p>
            </div>

            <div className="flex flex-col gap-3 border-t border-canvas/20 pt-8">
              <h2 id="member-heading" className="font-display text-h3">
                Check out as a MONO Member and get free delivery on orders {memberFreeFrom}+
              </h2>
              <p className="text-body text-canvas/80">
                Use your MONO Member email to log in. New here? Joining is free.
              </p>
            </div>

            <ul className="flex flex-col divide-y divide-canvas/20 border-y border-canvas/20">
              {PERKS.map(([numeral, perk]) => (
                <li key={numeral} className="flex items-baseline gap-4 py-3 text-small">
                  <span aria-hidden="true" className="w-8 text-caption text-canvas/60">
                    {numeral}
                  </span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col gap-3">
              <ButtonLink
                href="/login?next=%2Fcheckout"
                variant="inverse"
                size="lg"
                shape="pill"
                className="w-full"
                data-testid="choose-member"
              >
                Log in / Sign up
              </ButtonLink>
              <p className="text-center text-caption text-canvas/60">Free to join</p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="guest-heading"
          className="flex flex-col gap-8 rounded-md border border-line p-8"
          data-testid="guest-panel"
        >
          <div className="flex flex-col gap-3">
            <h2 id="guest-heading" className="font-display text-h3">
              Check out as a Guest
            </h2>
            <p className="text-body text-ink-muted">
              No account needed. You can create a free MONO Member profile after your order.
            </p>
          </div>
          <ButtonLink
            href="/checkout?as=guest"
            variant="secondary"
            size="lg"
            shape="pill"
            className="mt-auto w-full"
            data-testid="choose-guest"
          >
            Guest Checkout
          </ButtonLink>
        </section>
      </div>
    </div>
  );
}
