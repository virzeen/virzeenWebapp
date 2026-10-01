# Spec: Favourites

**Status:** Built (2026-09-30, branch `feat/product-styles`)
**Owner approval:** owner, 2026-09-29 ("Anyone, in the browser": guests keep favourites in the browser; they move to the account on sign-in). Moves "wishlist" from phase 2 into phase 1 (`project-brief.md` §3).
**Related docs:** `specs/product-page.md` · `security/security-policy.md` §6 · `database/data-rules.md`

## Goal

Anyone can save products they like with "Favourite" and find them again on a Favourites page. Guests' favourites live in their browser; after signing in they move to the account, so they show on every device.

## User flow

1. Product page → pick a style → "Favourite" → the button reads "Favourited" with a filled heart; toast "Added to favourites" with "View" (→ `/favourites`).
2. Press again → removed ("Removed from favourites").
3. Header heart → `/favourites`: a grid of saved products (the saved style's photo, name, price, style), each with "Remove"; empty state with "Start shopping". Since 2026-09-30 the page looks like Nike's: see "Nike layout" below (Edit mode for Remove, Add to bag on each card).
4. A guest signs in → their browser favourites are added to the account (up to the limit) and cleared from the browser.

## Acceptance criteria

- [x] A favourite is a product plus the picked style (`color`, "" when the product has no styles); saving White and Black keeps two. The button shows the state of the style picked now (`aria-pressed`, label "Favourite" / "Favourited", heart outline / filled).
- [x] Guests: stored in localStorage (`virzeen:favourites`, list of `{ productId, color, savedAt }`, newest first, at most 100); works without an account; every tab updates (storage event).
- [x] Signed-in: stored in the database through a server action (idempotent `saved: true|false`), updated optimistically; on failure the button goes back and a toast shows the error.
- [x] On the first page load after sign-in, browser favourites are merged into the account (existing ones kept, newest first, capped at 100) and the keys sent leave the browser list. Unpublished or archived products are skipped.
- [x] `/favourites` (public route, `noindex`): signed-in → the account's favourites (server-rendered); guest → the browser's, loaded by product id. Each card links to `/product/{slug}?style={color}` and shows that style's photo; "Remove" removes it (focus moves to the next card's Remove, else the previous one's, else the heading). Products no longer on sale are left out. Title "Favourites", count "{n} items".
- [x] Header: a heart icon link "Favourites" (before the account icon) on every page, and a "Favourites" link in the mobile menu and the account nav.
- [x] Limit: 100 per account, and 100 in a guest's browser; more → "You can save up to 100 favourites. Remove one to add another." (the same words for guests).
- [x] Rate limit `favourite`: 60 per minute per user for saving and for the merge (and per IP for the guest product lookup).
- [x] Privacy page lists favourites under what we store.

## Out of scope

- Size-level favourites, sharing lists, price-drop emails, a count badge, favourites in `/api/v1` (the app uses the web pages).

## Data & API

- New `Favourite`: `userId` → User (cascade), `productId` → Product (cascade), `color String @default("")`, timestamps; `@@unique([userId, productId, color])`, `@@index([userId, createdAt])`, `@@index([productId])`. Hard-deleted when removed (not catalog data).
- Validators: `favouriteKeySchema` `{ productId, color }`, `setFavouriteSchema` (+ `saved`), `mergeFavouritesSchema` (up to 100 keys), `favouriteProductsSchema` (guest lookup, up to 100 keys).
- Core `favouriteService`: `set(userId, input)`, `listKeys(userId)`, `list(userId)` (product summaries with the style's photo, published only), `merge(userId, keys)`, `summariesFor(keys)` (guests, published only).
- Server: `setFavouriteAction`, `mergeFavouritesAction`, `listFavouriteProductsAction` (guest lookup); `listMyFavouriteKeys` read in the site layout for signed-in users (one indexed query).

## Tests

- Validators: key limits, color max 40.
- Core: set/unset idempotent, per-style keys, cap, merge (dedupe, cap, skips unpublished), list order and published-only, `summariesFor`.
- Web unit: the local store (add/remove/cap/parse bad JSON).
- E2E: guest favourites a product, sees it on `/favourites`, signs in, still sees it (now from the account); removes it.

## Decisions while building (2026-09-30)

- **Merge after sign-in:** runs once per page load (also under React Strict Mode) and again if favourites reach the browser while signed in (a tab still showing the signed-out page). Only the keys it sent leave the browser. A failed merge keeps them there for the next page load. When the merge changed the account's list the page refreshes, and `/favourites` shows skeletons until then.
- **Products no longer on sale:** a guest's keys that the lookup doesn't return leave the browser list, so they can't fill it up out of sight. An account keeps them, but when its list is full (on save or merge) they are deleted first to make room: they show nowhere, so the customer couldn't remove them.
- If every style is sold out, Favourite saves the first style.
- The button changes its label and sets `aria-pressed`, as this spec asks; WAI-ARIA advises one or the other (owner may decide).
- Each card shows the saved style's photo (its own, else the shared photos), the lowest price of its sizes and its stock. A favourite whose style is no longer sold shows the product's usual photo and price, with no style line, and links to `/product/{slug}`.
- When an admin renames a style, favourites move to the new name in the same save (one per customer).
- Merging at sign-in removes favourites of off-sale products only when the new ones don't all fit.
- The signed-in page shows favourites saved on another device right away and refreshes the header once. On the guest error, Try again moves focus to the heading.
- Each signed-in press re-renders the current page (`setFavouriteAction` revalidates `/favourites`).

## Nike layout (2026-09-30)

**Owner approval:** owner, 2026-09-30, through the ops session: "make favourites, the bag and checkout look like Nike's on phone and computer, keeping our icons and styling". This session does the Favourites page; the bag and checkout are on `feat/nike-bag-checkout`.

- [x] Title "Favourites" at the top left; an "Edit" text button at the top right ("Done" while editing; `aria-pressed`). No visible count (a screen-reader-only "{n} items" stays). _Edit/Done replaced by the hearts on 2026-10-01 (below)._
- [x] Grid: 2 columns on phones, 3 from `md`.
- [x] Each card: the square photo (links to the product with the saved style), then the name with the price on the right (under it on phones), then the category and the style in grey _(2026-10-01: name and category on the left, price on the right; pill "Add to bag" instead of "Select size"; see below)_ ("Tops · Black"; just the category without a style), then an outlined pill button across the card: "Add to bag" when the saved style has one variant for sale, "Select size" when it has sizes, "Sold out" (disabled) when none is in stock, "View product" (a link) when the saved style isn't sold any more but another style is in stock.
- [x] "Add to bag" adds that variant (the product page's add path: `addToCartAction`, then the bag opens as after any add) and says "Added to bag". When the bag already holds every piece left, it says so as the product page does ("The last one is already in your bag.") without asking the server. "Select size" opens a small popup ("Select size", the product name) with the style's sizes as the product page shows them (sold-out sizes struck through), and "Add to bag"; picking a size and adding closes it.
- [x] _(Replaced 2026-10-01 by the heart.)_ Edit mode: a round remove button (X, "Remove {name}") on the top right of each photo; Remove works as before (focus to the next card's Remove, else the previous one's, else "Done"). "Done" leaves edit mode. Leaving the page resets it.
- [x] Empty state: "Items added to your Favourites will be saved here." with "Shop" (a link to `/shop`); "Edit" is hidden when there's nothing.
- [x] Data: each favourite carries its style's variants for sale (id, size, stock, price) and the category name (core `favouriteService.list` / `summariesFor`, `FavouriteView`).
- [x] E2E (rewritten 2026-10-01 for the hearts and the popup, see below; passes): the favourites journey adds a favourite to the bag from the page (a size through "Select size"), removes one in edit mode, and sees the empty state. (Written in `tests/e2e/favourites.spec.ts` and typechecked on 2026-09-30; not run yet.)

Decisions while building (2026-09-30, branch `feat/nike-favourites`):

- A style with sizes always opens "Select size", even with one size (the product page asks for a size too). "Add to bag" is for a style without sizes. A style no longer sold (or a favourite saved without a style whose product has styles now) has no variants: its pill is "View product", a link to the product's page, while the product is in stock in another style (the card shows the product's usual photo, price and stock), else "Sold out".
- The price is still the lowest of the style's sizes, without "From". The "Out of stock" badge on the photo is gone: the pill says "Sold out".
- Remove keeps its name "Remove {name}, {style}", so two styles of one product don't share it.
- After the last Remove, "Done" stays (it holds focus) until pressed; then it goes and focus moves to the heading.
- The popup's "Add to bag" works like the product page's before a size is picked: it says "Select a size" and focuses the first size. Its errors show inside the popup: behind a modal a toast is hidden from screen readers. While an add runs the popup can't close (no X, Escape and a click outside wait), as the admin's dialogs do, so its answer always shows there; each opening starts with no size and no message. The card's own "Add to bag" shows errors as a toast, as the product page does; so does "The last one is already in your bag." (the product page shows it under its button).
- The grid is the page's own `FavouritesGrid` (2 / 3 columns), not a new `Grid` variant.
- On phones (below `sm`) the price goes under the name, as on the shop's product cards: beside it, a half-width column at 360px leaves about 80px for the name, so "Monochromium" or "Heavyweight" would break in the middle. The name breaks a word only when the word alone is wider than the card.

## Hearts, the Add to bag popup and the bag page (2026-10-01)

**Owner approval:** owner, 2026-10-01, with screenshots of Nike's pages: "the favourite unfavourite icon need to be in the top right corner", "the product name catagory in the left side and the price in the right side", in place of Select size "there need to be Add to the bag and when we click add to the bag there need to open the popup panel having this UI" (Nike's quick add), "when we add the product in the bag it will say added"; "after unfavourite then it will come the this Undo button … if he didnt do the undo then after 5 sec the product will be fade off and dissappear"; on the bag page "if there is the favourite then in the carts it need to show the favourites after the bag products. if no have you need to show You might also like and then the carausel".

- [x] Cards: the name with "Category · Style" under it on the left, the price on the right (from `sm`; under them on phones, as before). A round heart on the photo's top right (filled, `aria-pressed`, "Favourite {name}, {style}"); Edit/Done and the X are gone.
- [x] The heart removes the favourite at once. The card dims, its heart empties, and a dark bar on the photo says "Removed from favourites" with Undo; Undo (or the empty heart) saves it again. Without Undo, 5 seconds later the card fades away (400 ms) and leaves the page. If the save fails the heart fills again (toast).
- [x] The pill says "Add to bag" for every style for sale. A style without sizes is added straight away; one with sizes opens the Add to bag popup (Nike's quick add, `Dialog size="split"`): the style's photos on the left with previous/next (from `lg`), the name, "Category · Style", the price and the sizes on the right, "View full product" and "Add to bag" under a hairline. Phones: a bottom sheet with a small photo by the name. Add to bag before a size: "Select a size" and a red ring around the sizes.
- [x] Once the bag holds the saved style (any size), the pill says "Added" with a black tick.
- [x] Bag page, under the bag (also when it's empty): "Favourites" with the two newest favourites (photo, name and price, "Category · Style", the same pill) and "View more favourites" when there are more; no favourites: "You might also like", a carousel of the newest products not in the bag.
- [x] The bag line's quantity pill (a bin at 1, "−" from 2) with the heart beside it was already built on 2026-09-30 (patterns.md §7).
- [x] Data: each favourite carries its style's photos (`FavouriteView.photos`, core `favouriteService`).
- [x] E2E: the favourites journey adds through the popup, sees "Added" on the page and under the bag, removes with the heart, uses Undo, waits for the fade to the empty state, and sees "You might also like" on the bag page.

Decisions while building (2026-10-01):

- "Added" still adds: pressed again it adds another piece (one variant) or opens the popup for another size, so screen readers hear "Added to bag. Add another".
- The 5 seconds wait while a keyboard user's focus is inside the card (WCAG 2.2.1, time to reach Undo); a mouse click doesn't hold it. When the card that goes held focus, focus moves to the next card's heart, else the previous one's, else the h1.
- A card removed and left alone stays gone when the list comes again; one pressed and saved again keeps its place.
- The popup keeps our colours and words: a black "Add to bag" that stays pressable (before a size it explains, instead of a greyed button), "Select a size" without "Please", our size boxes (the picked one filled).
- Bag page: "You might also like" shows only without favourites, as asked (Nike shows both). The favourites under the bag are the two newest; signed in they're read on the server, a guest's in the browser, so a guest's bag page shows that part once they're looked up.
- The heart is `Button variant="inverse"` (white, no border, like Nike's); on a white photo only the heart shows.

## "Added to favourites" panel (2026-10-01)

**Owner approval:** owner, 2026-10-01, with a screenshot of Nike's: "when we added to the favourites then automatically the favourites rectangle pops out". Same day, about the bag: "when we add to bag the side panel from the right side pops out same like before … the previous one is better" (the bag drawer is back; `ui/patterns.md` §7).

- [x] Saving with the product page's Favourite, or a bag-page line's heart, opens "Added to favourites" (a `DropPanel` under the header on the right; across the top on phones): a black tick, the style's photo, the name, "Category · Style" (a bag line: the style) and the price, then "View favourites". Escape, the X or a click outside closes it; focus goes back to the pressed button. It replaces the "Added to favourites — View" toast there.
- [x] Removing still says "Removed from favourites" in a toast. The Favourites page's own hearts keep their Undo bar (no panel).
- [x] In the bag drawer a line's heart keeps the toast: the panel would open behind the drawer.
- [x] E2E: the favourites journey checks the panel (name, "Tops · Bone", View favourites) and that focus returns to "Favourited".
- [x] Black and white only (owner, 2026-10-01: "we dont want green only black and white only"): the "Added" pill and "Added to favourites" use a white tick on a black disc. The Undo bar slides up from inside the photo ("i cant see the undo comming up from the picture inside").
