import { ButtonLink, Container, EmptyState, Grid, Link, Skeleton } from "@virzeen/ui";
import type { ShopFilters } from "@virzeen/validators";
import type { ProductCardData } from "./product-card";
import { ProductGrid, ProductResults } from "./product-grid";
import { ShopToolbar } from "./shop-toolbar";

type ShopListingData = {
  page: { items: ProductCardData[]; nextCursor: string | null };
  categories: { slug: string; name: string }[];
  options: { sizes: string[]; colors: string[] };
};

type ShopListingProps = {
  data: ShopListingData;
  title: string;
  intro?: string | null;
  filters: ShopFilters;
  /** Current URL params, passed back to "Load more". */
  params: Record<string, string>;
  activeCategory?: string;
};

const CHIP =
  "inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-4 text-small aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-canvas";

/** Shared layout for /shop, /shop/[category] and /collections/[slug] (patterns.md §5). */
export function ShopListing({ data, title, intro, filters, params, activeCategory }: ShopListingProps) {
  const { page, categories, options } = data;
  const hasFilters = Boolean(filters.size || filters.color || filters.inStock);

  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16">
      <header className="flex flex-col gap-4">
        <h1 className="font-display text-h1">{title}</h1>
        {intro && <p className="max-w-prose text-body-lg text-ink-muted">{intro}</p>}
        {categories.length > 0 && (
          // Chips wrap instead of scrolling sideways, so the current one is never off-screen on a phone.
          <nav aria-label="Categories" className="flex flex-wrap gap-2">
            <Link
              href="/shop"
              variant="subtle"
              aria-current={!activeCategory && !filters.collection ? "page" : undefined}
              className={CHIP}
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/shop/${category.slug}`}
                variant="subtle"
                aria-current={activeCategory === category.slug ? "page" : undefined}
                className={CHIP}
              >
                {category.name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <ProductResults initialItems={page.items} initialCursor={page.nextCursor} filters={params}>
        <ShopToolbar sizes={options.sizes} colors={options.colors} />

        {page.items.length === 0 ? (
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
        ) : (
          <ProductGrid />
        )}
      </ProductResults>
    </Container>
  );
}

const CHIP_SKELETONS = ["a", "b", "c", "d", "e"];
const CARD_SKELETONS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];

/** Loading state for `ShopListing` (ui-discipline.md §6): title, chips, toolbar and one page of cards. */
export function ShopListingSkeleton({ intro = false }: { intro?: boolean }) {
  return (
    <Container className="flex flex-col gap-8 py-12 lg:py-16" aria-busy>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-48 lg:h-11" />
        {intro && <Skeleton shape="text" className="w-full max-w-prose" />}
        <div className="flex flex-wrap gap-2">
          {CHIP_SKELETONS.map((id) => (
            <Skeleton key={id} className="h-11 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y border-line py-3">
        <Skeleton shape="text" className="w-24" />
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Skeleton className="h-11 w-24 rounded-full lg:h-9" />
          <Skeleton className="h-11 flex-1 sm:w-48 sm:flex-none" />
        </div>
      </div>
      <Grid columns="products" gap={4} className="gap-y-10">
        {CARD_SKELETONS.map((id) => (
          <div key={id} className="flex flex-col gap-3">
            <Skeleton shape="image" />
            <Skeleton shape="text" className="w-3/4" />
            <Skeleton shape="text" className="w-1/3" />
          </div>
        ))}
      </Grid>
    </Container>
  );
}
