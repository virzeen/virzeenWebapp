# Spec: Search

**Status:** Built
**Owner approval:** Virzeen founder, 2026-11-08 (launch plan week 1, "go for it now"); the details below were chosen by Claude and are reviewed in the PR
**Related docs:** `ui/patterns.md` §5 and §11, `ui/content-style.md` "Search", `backend/api-contract.md` (`q`), `database/data-rules.md` §1

## Goal

Customers find a product by typing what they remember: a name ("overshirt"), a kind ("tops"), a colour ("black"), a collection ("monsoon") or a style number from an Instagram post ("VZ0042-101"). Results show while they type, and Enter opens every match on the shop page with its filters and sort.

## User flow

1. A search icon ("Search") sits in the header on every storefront page, phones included, left of Favourites.
2. It opens a panel laid out like Nike's (owner, 2026-11-08): it drops from the top, as tall as its content from `md` with the page dimmed below, the whole screen on phones. The top row holds the wordmark (from `md`), a rounded grey box with a magnifier and "Search" inside, and "Cancel". Before typing it shows "Popular search terms" as grey pills; until searches are counted, the terms are the categories, and each one searches for its name.
3. From 2 characters, up to 6 matching products show as product cards in the shop's grid, as wide as the shop (2 rows of 3 from 960px, 3 rows of 2 below it (nike.com, 2026-11-10); owner 2026-11-08), newest first, a moment after typing stops. "See all results" opens `/shop?q={query}`.
4. Enter opens `/shop?q={query}`: the shop listing titled `Results for "{query}"`, with the toolbar's filters, sort and Load more.

## Acceptance criteria

- [x] Given a published product named "Linen Overshirt", when a customer searches "linen", then it is in the results; "LINEN" and " linen " find it too.
- [x] Each word must match at least one of: the product name, its category's name, a collection's name (not archived), a style name (an active variant's colour), a style's colour shown or a style number. "black tee" finds a black tee, not every black product.
- [x] A word over 3 letters ending in "s" also matches without it: "tops" finds "Top", "tees" finds "Tee".
- [x] Drafts, archived products, products in an archived category and products with nothing for sale never show.
- [x] The panel shows at most 4 cards; "See all results" and Enter go to `/shop?q=` with the same query.
- [x] `/shop?q=` keeps `q` when sorting, filtering or loading more; "Clear all" keeps it (it is not a filter).
- [x] No match: `Nothing matches "{query}".` with "Try a different word or browse all products." and [Show all products] (to `/shop`), in the panel and on the page.
- [x] `/shop?q=` is `noindex, follow` with the canonical `/shop`, and its tab reads `Results for "{query}" | Virzeen` when the page is opened directly (a shared link, a search engine). **Known issue:** after a search inside the site, the production build keeps the tab title (and head) of the `/shop` page it prefetched from the header's Shop link or the panel's "All products"; the h1 and results are right. Seen in e2e on 2026-11-08, not in `pnpm dev`. Crawlers always load the page directly, so indexing isn't affected.
- [x] The query is at most 60 characters and 5 words (extra words are ignored); `%`, `_` and `\` are dropped, so they match nothing special.
- [x] `/api/v1/products` accepts the same `q`.

## Out of scope

- Ranking by relevance (results keep the shop's sort, newest first), typo tolerance, search suggestions or recent searches.
- Searching portfolio stories or the description text.
- A search index (pg_trgm or a service): the catalogue is small; see `database/data-rules.md` §1 for when to add one.

## UI

- Screens/components affected: `SiteHeader` (the icon), new `SearchPanel` and `SearchResults` (`client/features/search`), `/shop` page title, empty state and metadata.
- Primitives needed: `Sheet side="drop"` with `header` (new), `Input variant="pill"` with `startIcon` (new), `Button`, `ButtonLink`, `Link`, `Skeleton`, `EmptyState`, `Alert`. No new primitive.
- States: before typing → "Popular search terms" pills; typing → skeleton cards; results → cards + "See all results"; none → the no-results copy; error → danger `Alert` with the standard message and [Try again]. A hidden status line reads the count ("1 product", "{n} products", "{n}+ products", "No products").

## Data & API

- Models touched: none (reads only).
- Validators: `shopFiltersSchema.q` (from the URL: lenient, falls back to none); `productSearchSchema` (the panel's action: strict, 2–60 characters).
- Core: `catalogReads.listProducts` takes `q` (`searchWhere`); `searchWords` (pure) splits and cleans the query.
- Server action: `searchProductsAction` (rate limit `api`, 6 results).
- `/api/v1/products`: new optional `q` (api-contract.md).

## Edge cases

- Typing quickly: only the last query's answer is shown; an older answer arriving late is ignored.
- A query of only `%` or spaces: no words, so it lists everything (the page) or nothing is asked (the panel).
- Search on `/shop/{category}?q=` or a collection page searches inside that category or collection.

## Tests

- Unit: `searchWords` (case, spaces, plurals, the 5-word limit, dropped characters); `shopFiltersSchema` / `productSearchSchema`.
- Integration: `listProducts` with `q` (name, category, colour, style number, two words, drafts hidden).
- E2E: `search.spec.ts`: open the panel, type, see a card, Enter → results page with the query, no-results copy.
