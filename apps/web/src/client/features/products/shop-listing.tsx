import { ButtonLink, Container, EmptyState, Link } from "@virzeen/ui";
import type { ShopFilters } from "@virzeen/validators";
import type { ProductCardData } from "./product-card";
import { ProductGrid } from "./product-grid";
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

/** Shared layout for /shop, /shop/[category] and /collections/[slug] (patterns.md §5). */
export function ShopListing({ data, title, intro, filters, params, activeCategory }: ShopListingProps) {
  const { page, categories, options } = data;
  const hasFilters = Boolean(filters.size || filters.color || filters.inStock);
  const resultLabel =
    page.items.length === 0 ? "No products" : `${page.items.length}${page.nextCursor ? "+" : ""} products`;

  return (
    <Container className="gap-8 py-12 lg:py-16 flex flex-col">
      <header className="gap-4 flex flex-col">
        <h1 className="font-display text-h1">{title}</h1>
        {intro && <p className="max-w-prose text-body-lg text-ink-muted">{intro}</p>}
        {categories.length > 0 && (
          <nav aria-label="Categories" className="-mx-4 gap-2 px-4 pb-1 flex overflow-x-auto">
            <Link
              href="/shop"
              variant="subtle"
              aria-current={!activeCategory && !filters.collection ? "page" : undefined}
              className="min-h-11 px-4 inline-flex shrink-0 items-center rounded-full border border-line text-small aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-canvas"
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/shop/${category.slug}`}
                variant="subtle"
                aria-current={activeCategory === category.slug ? "page" : undefined}
                className="min-h-11 px-4 inline-flex shrink-0 items-center rounded-full border border-line text-small aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-canvas"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <ShopToolbar sizes={options.sizes} colors={options.colors} resultLabel={resultLabel} />

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
        <ProductGrid
          key={JSON.stringify(params)}
          initialItems={page.items}
          initialCursor={page.nextCursor}
          filters={params}
        />
      )}
    </Container>
  );
}
