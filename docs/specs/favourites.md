# Spec: Favourites

**Status:** Built (2026-09-30, branch `feat/product-styles`)
**Owner approval:** owner, 2026-09-29 ("Anyone, in the browser": guests keep favourites in the browser; they move to the account on sign-in). Moves "wishlist" from phase 2 into phase 1 (`project-brief.md` §3).
**Related docs:** `specs/product-page.md` · `security/security-policy.md` §6 · `database/data-rules.md`

## Goal

Anyone can save products they like with "Favourite" and find them again on a Favourites page. Guests' favourites live in their browser; after signing in they move to the account, so they show on every device.

## User flow

1. Product page → pick a style → "Favourite" → the button reads "Favourited" with a filled heart; toast "Added to favourites" with "View" (→ `/favourites`).
2. Press again → removed ("Removed from favourites").
3. Header heart → `/favourites`: a grid of saved products (the saved style's photo, name, price, style), each with "Remove"; empty state with "Start shopping".
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
