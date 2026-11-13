import { ButtonLink, EmptyState, Link, MembershipCard } from "@virzeen/ui";
import { LEVEL_NAMES } from "@virzeen/validators/membership";
import { Heart } from "lucide-react";
import { LogoMark } from "@/client/components/layout/logo-mark";
import { ProductCarousel } from "@/client/features/products/product-carousel";
import { StockAlertList } from "@/client/features/stock-alerts/stock-alert-list";
import { formatDate, formatMonthYear } from "@/client/lib/format";
import { requireUserPage } from "@/server/auth/session";
import { getMyMembership, listMyFavourites, listMyStockAlerts } from "@/server/queries/account";

/** How many favourites the profile's row shows; "View all" opens the rest. */
const FAVOURITES_SHOWN = 12;

/**
 * The profile, like Nike's member page (owner 2026-11-08): a round initial, the name as the h1 with "Member since
 * {month year}", then the customer's favourites as a row of cards with "View all" (one card per product, newest
 * first), then the sizes they asked to hear about ("Notify me", specs/notify-me.md; only when there are some).
 */
export default async function ProfilePage() {
  const user = await requireUserPage("/account");
  const [favourites, alerts, membership] = await Promise.all([
    listMyFavourites(user.id),
    listMyStockAlerts(user.id),
    getMyMembership(user.id),
  ]);
  const isPass = membership.level === "PASS";
  const seen = new Set<string>();
  const products = favourites
    .map((favourite) => favourite.product)
    .filter((product) => !seen.has(product.id) && Boolean(seen.add(product.id)))
    .slice(0, FAVOURITES_SHOWN);
  const name = user.name.trim() || user.email;
  // No name yet: the email stands in, smaller, and wraps before the "@" instead of inside a word (owner 2026-11-10).
  const isEmail = !user.name.trim();

  return (
    <div className="flex flex-col gap-16 lg:gap-24">
      {/* Phones: centred, the circle over the name, like Nike's member page (owner 2026-11-10); from md side by side. */}
      <div className="flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface font-display text-h2 text-ink-muted"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="flex max-w-full min-w-0 flex-col gap-1">
          {/* Focus lands on the name when the last "Notify me" request is removed (tabIndex -1). */}
          {isEmail ? (
            <h1 id="profile-name" tabIndex={-1} className="font-display text-h3 wrap-break-word md:text-h2">
              {name.split("@")[0]}
              <wbr />@{name.split("@").slice(1).join("@")}
            </h1>
          ) : (
            // Nike's name size from md; 24px on phones, so a long name stays on a line or two.
            <h1 id="profile-name" tabIndex={-1} className="font-display text-h2 wrap-break-word md:text-h1">
              {name}
            </h1>
          )}
          <p className="text-body text-ink-muted">Member since {formatMonthYear(user.createdAt)}</p>
        </div>
      </div>

      {/* The member's level (specs/membership-portal.md): the plain card for a free MONO Member, the black one for the Pass. */}
      <section aria-labelledby="membership-heading" className="flex flex-col gap-8">
        <h2 id="membership-heading" className="font-display text-h2">
          {isPass ? LEVEL_NAMES.PASS : LEVEL_NAMES.FREE}
        </h2>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <MembershipCard
            level={isPass ? "pass" : "member"}
            name={name}
            title={isPass ? LEVEL_NAMES.PASS : LEVEL_NAMES.FREE}
            caption={
              isPass && membership.passEndsAt
                ? `Valid until ${formatDate(membership.passEndsAt)}`
                : `Member since ${formatMonthYear(user.createdAt)}`
            }
            logo={<LogoMark className="h-8 w-auto" />}
            role="img"
            aria-label={`${isPass ? LEVEL_NAMES.PASS : LEVEL_NAMES.FREE} card`}
          />
          <div className="flex flex-col items-start gap-4">
            <ButtonLink href="/account/membership" shape="pill" size="lg">
              Your membership
            </ButtonLink>
            <Link href="/membership" variant="header">
              See every benefit
            </Link>
          </div>
        </div>
      </section>

      {products.length > 0 ? (
        <ProductCarousel
          title="Favourites"
          products={products}
          action={
            <Link href="/favourites" variant="header">
              View all
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="profile-favourites" className="flex flex-col gap-6">
          <h2 id="profile-favourites" className="font-display text-h2">
            Favourites
          </h2>
          <EmptyState
            icon={<Heart className="size-5" strokeWidth={1.5} aria-hidden />}
            title="Items added to your Favourites will be saved here."
            action={
              <ButtonLink href="/shop" shape="pill">
                Shop
              </ButtonLink>
            }
          />
        </section>
      )}

      <StockAlertList alerts={alerts} emptyFocusId="profile-name" />
    </div>
  );
}
