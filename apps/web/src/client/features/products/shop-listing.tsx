import { ButtonLink, Container, EmptyState, Grid, Link, Skeleton } from "@virzeen/ui";
import type { ShopFilters } from "@virzeen/validators";
import { ListingPhoneRow } from "./listing-phone-row";
import { ProductCard, type ProductCardData } from "./product-card";
import { ProductGrid, ProductResults } from "./product-grid";
import { ShopBrowse } from "./shop-browse";
import { ShopSidebar } from "./shop-sidebar";
import { SortMenu } from "./sort-menu";
import { ShopToolbar } from "./shop-toolbar";

type ShopListingData = {
  page: { items: ProductCardData[]; nextCursor: string | null };
  /** Every product the listing holds, whatever "Load more" has shown. */
  total: number;
  /** The members-only products for the same filters: shown to everyone, in their own row under the grid. */
  membersOnly: ProductCardData[];
  collections: { slug: string; name: string }[];
  options: { sizes: string[]; colors: string[] };
};

type ShopListingProps = {
  data: ShopListingData;
  title: string;
  intro?: string | null;
  filters: ShopFilters;
  /** Current URL params, passed back to "Load more". */
  params: Record<string, string>;
  activeCollection?: string;
};

// Plain text tabs, no rectangles (owner 2026-11-16): the current collection is black with a line under it.
const CHIP =
  "inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent text-small text-ink-muted hover:text-ink aria-[current=page]:border-ink aria-[current=page]:font-medium aria-[current=page]:text-ink";

/**
 * Shared layout for /shop and /collections/[slug] (patterns.md §5), like Nike's listing from lg
 * (owner 2026-11-08): "{title} ({total})" in a bar that sticks while scrolling, Show Filters and Sort By, 3 products
 * a row. On phones (owner 2026-11-16): the title, a sideways row of collections, a sticky bar with Filters (icon only)
 * and Sort By, then 2 products a row.
 */
export function ShopListing({ data, title, intro, filters, params, activeCollection }: ShopListingProps) {
  const { page, total, membersOnly, collections, options } = data;
  const hasFilters = Boolean(filters.size || filters.color || filters.inStock);
  const acrossCollections = Boolean(filters.q);

  const chips = collections.length > 0 && (
    // Phones: part of the sideways row (ListingPhoneRow scrolls the current chip into view).
    <nav aria-label="Collections" className="flex shrink-0 gap-6">
      <Link
        href="/shop"
        variant="subtle"
        aria-current={!activeCollection && !acrossCollections ? "page" : undefined}
        className={CHIP}
      >
        All
      </Link>
      {collections.map((collection) => (
        <Link
          key={collection.slug}
          href={`/collections/${collection.slug}`}
          variant="subtle"
          aria-current={activeCollection === collection.slug ? "page" : undefined}
          className={CHIP}
        >
          {collection.name}
        </Link>
      ))}
    </nav>
  );

  const empty = filters.q ? (
    <EmptyState
      title={`Nothing matches "${filters.q}".`}
      description="Try a different word or browse all products."
      action={
        <ButtonLink href="/shop" shape="pill">
          Show all products
        </ButtonLink>
      }
    />
  ) : (
    <EmptyState
      title={hasFilters ? "Nothing matches these filters." : "New pieces are on their way."}
      description={
        hasFilters
          ? "Try removing a filter or browse all products."
          : "Check back soon — or explore our portfolio."
      }
      action={
        <ButtonLink href={hasFilters ? "/shop" : "/portfolio"} shape="pill">
          {hasFilters ? "Browse all products" : "View the portfolio"}
        </ButtonLink>
      }
    />
  );

  return (
    <Container className="flex flex-col gap-4 py-4 lg:gap-8 lg:pt-6 lg:pb-10">
      <ProductResults initialItems={page.items} initialCursor={page.nextCursor} filters={params}>
        {/* Nike's listing title: 20px on phones, 24px from lg (smaller again once the bar sticks). */}
        <ShopBrowse
          heading={
            <h1 className="font-display text-h3 lg:text-h2 lg:group-data-stuck/bar:text-h3">
              {title} <span className="whitespace-nowrap">({total})</span>
            </h1>
          }
          intro={intro}
          phoneBar={
            // Phones (owner 2026-11-16): the collections in a sideways row under the title, then a bar with an
            // icon-only Filters button and Sort By that sticks under the site header while scrolling.
            <>
              {chips && <ListingPhoneRow>{chips}</ListingPhoneRow>}
              <div
                data-phone-listing-bar
                className="sticky top-below-header z-10 -mx-gutter flex items-center gap-2 bg-canvas px-gutter py-2"
              >
                <ShopToolbar sizes={options.sizes} colors={options.colors} />
                <SortMenu variant="secondary" align="start" />
              </div>
            </>
          }
          sidebar={
            <ShopSidebar
              collections={collections}
              activeCollection={activeCollection}
              acrossCollections={acrossCollections}
              sizes={options.sizes}
              colors={options.colors}
            />
          }
        >
          {page.items.length === 0 && membersOnly.length === 0 ? (
            empty
          ) : (
            <div className="flex flex-col gap-12">
              {page.items.length > 0 && <ProductGrid />}
              {membersOnly.length > 0 && (
                // Everyone sees these; only Monochrome Pass members can buy them (specs/catalog-groups-visibility.md).
                <section aria-labelledby="members-only-heading" className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 id="members-only-heading" className="font-display text-h3">
                      For Members only
                    </h2>
                    <p className="text-body text-ink-muted">
                      Everyone can look. Only Monochrome Pass members can buy.
                    </p>
                  </div>
                  <Grid columns="products" gap={4}>
                    {membersOnly.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </Grid>
                </section>
              )}
            </div>
          )}
        </ShopBrowse>
      </ProductResults>
    </Container>
  );
}

const CHIP_SKELETONS = ["a", "b", "c", "d", "e"];
const CARD_SKELETONS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
/**
 * Loading state for `ShopListing` (ui-discipline.md §6): the title bar, then below lg the collections row and the filter bar, and one
 * page of square cards (2 a row, 3 from lg; the filters start hidden).
 */
export function ShopListingSkeleton({ intro = false }: { intro?: boolean }) {
  return (
    <Container className="flex flex-col gap-4 py-4 lg:gap-8 lg:pt-6 lg:pb-10" aria-busy>
      <div className="flex items-center justify-between gap-4 lg:h-16">
        <Skeleton className="h-9 w-48" />
        <div className="hidden items-center gap-2 lg:flex">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </div>
      {intro && <Skeleton shape="text" className="w-full max-w-prose" />}
      <div className="-mx-gutter flex gap-6 overflow-hidden px-gutter lg:hidden">
        {CHIP_SKELETONS.map((id) => (
          <Skeleton key={id} shape="text" className="my-3.5 w-20 shrink-0" />
        ))}
      </div>
      <div className="flex gap-2 lg:hidden">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <Grid columns="products" gap={4}>
        {CARD_SKELETONS.map((id) => (
          <div key={id} className="flex flex-col gap-3">
            <Skeleton shape="square" />
            <div className="flex flex-col gap-3 px-card-inset">
              <Skeleton shape="text" className="w-3/4" />
              <Skeleton shape="text" className="w-1/2" />
              <Skeleton shape="text" className="w-1/3" />
            </div>
          </div>
        ))}
      </Grid>
    </Container>
  );
}
