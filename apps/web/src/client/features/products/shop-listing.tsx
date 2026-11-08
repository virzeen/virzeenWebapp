import { ButtonLink, Container, EmptyState, Grid, Link, Skeleton } from "@virzeen/ui";
import type { ShopFilters } from "@virzeen/validators";
import type { ProductCardData } from "./product-card";
import { ProductGrid, ProductResults } from "./product-grid";
import { ShopBrowse } from "./shop-browse";
import { ShopSidebar } from "./shop-sidebar";
import { ShopToolbar } from "./shop-toolbar";

type ShopListingData = {
  page: { items: ProductCardData[]; nextCursor: string | null };
  /** Every product the listing holds, whatever "Load more" has shown. */
  total: number;
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

/**
 * Shared layout for /shop, /shop/[category] and /collections/[slug] (patterns.md §5), like Nike's listing from lg
 * (owner 2026-11-08): "{title} ({total})" in a bar that sticks while scrolling, Show Filters and Sort By, 3 products
 * a row.
 */
export function ShopListing({ data, title, intro, filters, params, activeCategory }: ShopListingProps) {
  const { page, total, categories, options } = data;
  const hasFilters = Boolean(filters.size || filters.color || filters.inStock);
  const acrossCategories = Boolean(filters.collection || filters.q);

  const chips = categories.length > 0 && (
    // Chips wrap instead of scrolling sideways, so the current one is never off-screen on a phone.
    <nav aria-label="Categories" className="flex flex-wrap gap-2">
      <Link
        href="/shop"
        variant="subtle"
        aria-current={!activeCategory && !acrossCategories ? "page" : undefined}
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
    <Container className="flex flex-col gap-6 py-8 lg:gap-8 lg:pt-6 lg:pb-10">
      <ProductResults initialItems={page.items} initialCursor={page.nextCursor} filters={params}>
        <ShopBrowse
          heading={
            <h1 className="font-display text-h2 font-medium lg:group-data-stuck/bar:text-h3">
              {title} <span className="whitespace-nowrap">({total})</span>
            </h1>
          }
          intro={intro}
          phoneBar={
            <>
              {chips}
              <ShopToolbar sizes={options.sizes} colors={options.colors} />
            </>
          }
          sidebar={
            <ShopSidebar
              categories={categories}
              activeCategory={activeCategory}
              acrossCategories={acrossCategories}
              sizes={options.sizes}
              colors={options.colors}
            />
          }
        >
          {page.items.length === 0 ? empty : <ProductGrid />}
        </ShopBrowse>
      </ProductResults>
    </Container>
  );
}

const CHIP_SKELETONS = ["a", "b", "c", "d", "e"];
const CARD_SKELETONS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
/**
 * Loading state for `ShopListing` (ui-discipline.md §6): the title bar, then below lg the chips and toolbar, and one
 * page of square cards (2 a row, 3 from lg; the filters start hidden).
 */
export function ShopListingSkeleton({ intro = false }: { intro?: boolean }) {
  return (
    <Container className="flex flex-col gap-6 py-8 lg:gap-8 lg:pt-6 lg:pb-10" aria-busy>
      <div className="flex items-center justify-between gap-4 lg:h-16">
        <Skeleton className="h-9 w-48" />
        <div className="hidden items-center gap-2 lg:flex">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-28 rounded-full" />
        </div>
      </div>
      {intro && <Skeleton shape="text" className="w-full max-w-prose" />}
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="flex flex-wrap gap-2">
          {CHIP_SKELETONS.map((id) => (
            <Skeleton key={id} className="h-11 w-20 rounded-full" />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y border-line py-3">
          <Skeleton shape="text" className="w-24" />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Skeleton className="h-11 w-24 rounded-full" />
            <Skeleton className="h-11 flex-1 sm:w-48 sm:flex-none" />
          </div>
        </div>
      </div>
      <Grid columns="products" gap={4}>
        {CARD_SKELETONS.map((id) => (
          <div key={id} className="flex flex-col gap-3">
            <Skeleton shape="square" />
            <Skeleton shape="text" className="w-3/4" />
            <Skeleton shape="text" className="w-1/2" />
            <Skeleton shape="text" className="w-1/3" />
          </div>
        ))}
      </Grid>
    </Container>
  );
}
