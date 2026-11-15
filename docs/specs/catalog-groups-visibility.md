# Spec: Categories and collections become one thing, and who may see it

**Status:** Built (2026-11-15) on branch `feat/collections-merge`, approved by the owner in chat. Stacked on `feat/payment-window`: merging it also ships PR #38 and the top notice bar, because the home "Virzeen Archive's" section only exists there. Payment change (checkout line check): the owner reviews the PR before it merges.
**Related docs:** `specs/member-perks.md` (early access), `specs/membership-portal.md` (levels), `database/data-rules.md`, `security/security-policy.md`

## Owner decisions (2026-11-15)

1. **One table, no difference at all.** Categories and collections are the same thing. The name is **Collection** (admin menu "Collections", shop address `/collections/<slug>`).
2. **Hidden completely.** A shopper who may not see an item gets no card, search hit, menu link, tile, pick, sitemap line or page (the address shows "not found").
3. **Three levels** on a collection and on a product: **Public**, **MONO Members** (the free level, includes the Pass), **Monochrome Pass members**. "Monochromium members" = the Monochrome Pass.
4. **Overlap rule: shown if ANY of its collections allows the viewer** (and the product itself allows the viewer). A Pass-only collection only adds an extra place for Pass members; to make one product Pass-only, set the product itself or keep it only in Pass-only collections.
5. The setting sits in the admin **Collections** page (one form) and in the product editor's settings.

## Goal

An admin manages every group of products on **one page** with one form, puts a product in as many collections as they like, and chooses who sees each collection and each product.

## What changes

- **One group table.** Today's categories become collections (same id, name, slug, order); each product keeps its category as one of its collections. A collection now has: name, URL slug, description, order, Featured, Public from (early access), Visibility, archived.
- **Main collection per product (known limit):** the card's grey line and the breadcrumb show the main collection's name. A product that is public through another collection but whose main collection is hidden would show that hidden name, so keep the main collection a public one. This is a display limit, not a way to see the product.
- **Main collection per product.** A product has one **main collection** (what the category was). It gives the card's grey line, the breadcrumb and "You may also like". It is the first one ticked and can be changed in the product editor. A product needs a live main collection to be published.
- **Shop.** One address `/collections/<slug>`; `/shop/<category>` and the old collection links redirect to it. `/shop` stays "everything" (New and Featured etc. unchanged). The filter sidebar, the header menu, the phone menu and the home "Virzeen Archive's" tiles list every live collection the viewer may see, ordered by Order. "Your picks" loses its Categories/Collections tabs. Tile icons are picked by words in the name, with one default icon.
- **Archived** collections: a product needs a live **main** collection (as an archived category hid its products) and at least one live collection that allows the viewer. Archiving a collection is refused while products have it as their main collection.
- **Admin.** `/admin/collections` is the one page (list + form); `/admin/categories` redirects to it. The product editor's Category field becomes a Collections picker with a "main" marker.

## Visibility rule (one builder, used everywhere)

Viewer levels: visitor < MONO Member < Pass.

A product is visible to a viewer when: it is published and not archived; its own visibility allows the viewer; **at least one** of its live collections is visible to the viewer; its early-access time (`publicAt`) allows the viewer (unchanged). A collection is visible to a viewer when it is not archived, its visibility allows the viewer, and its own `publicAt` allows the viewer. The same builder serves lists, search, product and collection pages, metadata and JSON-LD, sitemap, `/api/v1`, related carousels, home tiles, picks, favourites rows, the bag and checkout line validation. It is **never** applied to orders, payments, reconciliation, emails, reviews or admin (a paid order for a product that later became Pass-only still completes).

## Acceptance criteria

Phase 1 (the merge, everything Public, nothing changes for shoppers):

- [ ] Every existing category exists as a collection with the same id/name/order; every product is in its former category's collection and has it as its main collection; category interests became collection interests; slug clashes got a suffix; counts match before and after the migration.
- [ ] The existing test suite passes after the change, updated only where a category became a collection.
- [ ] One admin Collections page adds, edits, reorders and archives; the product editor picks several collections and a main one.
- [ ] `/shop/<old category>` and `/collections/<old slug>` open the right collection; sitemap and header show every live collection.

Phase 2 (visibility):

- [ ] Given a Pass-only collection holding only Public products, a visitor and a MONO Member cannot see the collection or its products anywhere (lists, search, direct address, metadata, sitemap, `/api/v1`); a Pass member can.
- [ ] A MONO-only product is hidden from visitors everywhere and cannot be added to the bag; MONO and Pass members see it.
- [ ] A Public product in a Pass-only and a Public collection is visible to everyone.
- [ ] A bag line the buyer may no longer see is shown unavailable and cannot check out; a paid or paying order is never affected.
- [ ] Changing a visibility is audited (old and new level).
- [ ] Existing items are Public after migration.

## Out of scope

- A "locked" teaser, selling the Pass online, per-customer lists, the Pass's extra festival discount, collections inside collections.

## UI

- Admin Collections page: list (name, address, products count, badges: Featured, a lock for MONO / Pass, "Public from …"), form (Name, URL slug, Description, Order, Visibility, Public from, Featured). Product editor: Collections picker (checkbox list with a "main" choice) and a Visibility choice (Public / MONO Members / Monochrome Pass members) in the settings.
- Primitives: existing (`RadioGroup`, `Switch`, `Input`, `FormField`, `Badge`, `Checkbox`); Storybook server was unreachable on 2026-11-15, so choices follow `docs/ui/components-catalog.md`.
- Copy: "Visibility", "Public", "MONO Members", "Monochrome Pass members"; helper "Everyone else sees it as not found."
- States: skeleton, empty ("No collections yet."), error with retry, success toast.

## Data & API

- Schema: enum `Audience { PUBLIC MEMBER PASS }`; `Collection` gains `sortOrder`, `audience`; `Product` gains `audience` and `mainCollectionId` (Restrict). Two migrations: (1) additive: copy `Category` into `Collection` keeping ids, link products, backfill the main collection, turn category interests into collection interests; (2) drop `Category`, `Product.categoryId`, `MemberInterest.categoryId`.
- Validators: one `collectionSchema`; product schema with `collectionIds`, `mainCollectionId`, `audience`.
- Core: `catalogReads` / `catalogService` / interests / favourites / search / admin-reads use collections only; one visibility builder (`visibleProductWhere`, `visibleCollectionWhere`) with the viewer level.
- `/api/v1`: keep the wire names (`category` in product JSON stays the main collection's name/slug) unless `api-contract.md` says otherwise.

## Edge cases

- Favourites, "Notify me", the bag and checkout use the customer's own view (a Pass member can favourite a Pass-only product); a visitor's browser favourites use a visitor's view. Orders, payments, reconciliation, emails, reviews and admin never filter by viewer: a paid order for a product that later became Pass-only still completes and shows.
- `/api/v1` shows a visitor's view (members-only items are not offered to the mobile app until it sends a signed-in viewer).
- Search matches only the names of collections the viewer may see.

- Slug clash between a category and a collection: the migrated one gets a `-2` suffix.
- A product in no collection: gets its (former) category; products can't be published without a live main collection.
- An expired Pass or an admin viewing the shop sees what their current level allows; admin pages and the Preview route see everything.
- Caches that hold catalog data must include the viewer level in the key.

## Tests

Unit (core, `virzeen_test`): migration check on a scratch database (counts, clashes, a product in no collection, a user with both interest kinds); the visibility builder over product audience × collection audiences × visitor/MONO/Pass; cart add and checkout line validation; every leak path as a visitor against a Pass-only product. E2E: existing suites updated; a Pass-only collection is not found for a visitor and shown to a Pass member.
