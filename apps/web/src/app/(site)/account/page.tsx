import { ButtonLink, EmptyState, Link } from "@virzeen/ui";
import { Heart } from "lucide-react";
import { BenefitImageCard } from "@/client/features/membership/benefit-image-card";
import { BENEFIT_PAGES } from "@/client/features/membership/benefit-pages";
import { BenefitsCarousel } from "@/client/features/membership/benefits-carousel";
import { PassOffer } from "@/client/features/membership/pass-offer";
import { InterestsSection } from "@/client/features/profile/interests-section";
import { WalletPanel } from "@/client/features/membership/wallet-panel";
import { ProductCarousel } from "@/client/features/products/product-carousel";
import { StockAlertList } from "@/client/features/stock-alerts/stock-alert-list";
import { formatMonthYear } from "@/client/lib/format";
import { requireUserPage } from "@/server/auth/session";
import {
  getInterestOptions,
  getMyInterests,
  getMyMembership,
  getMyRecommendations,
  getMyWallet,
  listMyFavourites,
  listMyStockAlerts,
} from "@/server/queries/account";

/** How many favourites the profile's row shows; "View all" opens the rest. */
const FAVOURITES_SHOWN = 12;

/**
 * The profile, like Nike's member page (owner 2026-11-08): a round initial, the name as the h1 with "Member since
 * {month year}", then the points card, Your picks, the Pass offer (not for a Pass member), "Find your next favourite" and Member Benefits (Nike's order, specs/member-area-nike-layout.md), then the
 * customer's favourites as a row of cards with "View all" (one card per product, newest first), then the sizes they asked to hear about ("Notify me", specs/notify-me.md; only when there are some).
 */
export default async function ProfilePage() {
  const user = await requireUserPage("/account");
  const [favourites, alerts, membership, wallet, interests, interestOptions, recommendations] =
    await Promise.all([
      listMyFavourites(user.id),
      listMyStockAlerts(user.id),
      getMyMembership(user.id),
      getMyWallet(user.id),
      getMyInterests(user.id),
      getInterestOptions(user.id),
      getMyRecommendations(user.id),
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

      {/* The points card (the owner's earlier request); Nike's profile has no equivalent. */}
      <WalletPanel {...wallet} isPass={isPass} />

      {/* Nike's order (specs/member-area-nike-layout.md): Interests, "Find your next favourite", Member Benefits. */}
      <InterestsSection interests={interests} options={interestOptions} />

      {/* The Monochrome Pass offer, moved here from the membership page (owner 2026-11-14); a Pass member has it already. */}
      {!isPass && <PassOffer name={name} />}

      <ProductCarousel title="Find your next favourite" products={recommendations} />

      <BenefitsCarousel
        title="Member Benefits"
        items={BENEFIT_PAGES.map((page) => ({ id: page.slug, node: <BenefitImageCard page={page} /> }))}
      />

      {products.length > 0 ? (
        <ProductCarousel
          title="Favourites"
          products={products}
          heart={false}
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
