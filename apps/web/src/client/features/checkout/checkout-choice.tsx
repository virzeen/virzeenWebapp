import { ButtonLink } from "@virzeen/ui";
import { Price } from "@/client/components/shared/price";

type CheckoutChoiceProps = {
  /** The member free-delivery line, from the server's delivery rules. */
  memberFreeFromPaisa: number;
};

/**
 * The two ways to check out (docs/checkoutfeatures.md §3.1), laid out like Nike's: a centred title, two centred
 * columns with one thin vertical divider (stacked on phones, Member first), and black pill buttons. Log in and Sign
 * up both open the same email step (`/login`), which brings the customer back to checkout.
 */
export function CheckoutChoice({ memberFreeFromPaisa }: CheckoutChoiceProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 lg:gap-16">
      <h1 className="text-center font-display text-h2">Choose Your Preferred Checkout Experience</h1>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-0">
        <section
          aria-labelledby="member-heading"
          className="flex flex-col items-center gap-6 text-center lg:px-12"
          data-testid="member-panel"
        >
          <div className="flex flex-col gap-4">
            <h2 id="member-heading" className="font-display text-h3">
              Check out as a MONO Member and get free delivery on orders <Price paisa={memberFreeFromPaisa} />
              +
            </h2>
            <p className="text-body">Use your MONO Member email to log in. New here? Joining is free.</p>
          </div>
          <div className="mt-auto flex w-full flex-col gap-3">
            <ButtonLink
              href="/login?next=%2Fcheckout"
              size="lg"
              shape="pill"
              className="w-full"
              data-testid="choose-member"
            >
              Log in
            </ButtonLink>
            <ButtonLink
              href="/login?next=%2Fcheckout"
              size="lg"
              shape="pill"
              className="w-full"
              data-testid="choose-signup"
            >
              Sign up
            </ButtonLink>
          </div>
        </section>

        <section
          aria-labelledby="guest-heading"
          className="flex flex-col items-center gap-6 border-line text-center lg:border-l lg:px-12"
          data-testid="guest-panel"
        >
          <div className="flex flex-col gap-4">
            <h2 id="guest-heading" className="font-display text-h3">
              Check out as a Guest
            </h2>
            <p className="text-body">
              No account needed. You can create a free MONO Member profile after your order.
            </p>
          </div>
          <div className="mt-auto flex w-full flex-col gap-3">
            <ButtonLink
              href="/checkout?as=guest"
              size="lg"
              shape="pill"
              className="w-full"
              data-testid="choose-guest"
            >
              Guest Checkout
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}
