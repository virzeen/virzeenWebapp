# Spec: Product page, Nike-style (with product details and "Features that perform")

**Status:** Approved
**Owner approval:** owner, 2026-09-29 ("make it like the Nike one": https://www.nike.com/sg/t/sabrina-4-ep-basketball-shoes-SyaJY1Pc/II0403-101; product page first, the rest of the shop after they check it). Layout and interactions only: never Nike's name, logo, images or text.
**Related docs:** `specs/product-styles.md` · `specs/size-guides.md` · `specs/favourites.md` · `ui/patterns.md` §6 · `ui/content-style.md` · `backend/api-contract.md`

## Goal

A customer sees a product the way Nike shows one: a big photo with a thumbnail strip, the style tiles, a size grid with a Size guide, one large Add to bag button and a Favourite button, then the description, a "View product details" popup, and a "Features that perform" row with pictures. Picking a style (e.g. White) shows only that style's photos in the left gallery.

## User flow

1. Open `/product/{slug}` (or `/product/{slug}?style=White` from a shared link or a favourite).
2. Look through the photos: hover or tap a thumbnail (desktop) or swipe (phone).
3. Tap a style tile: the gallery, price and sizes switch to it and the address becomes `?style={name}` (no reload, no new history entry).
4. Pick a size (Size guide popup if unsure), Add to bag, or Favourite.
5. Read the description; "View product details" opens a popup with everything; scroll to "Features that perform" and "You may also like".

## Acceptance criteria

Layout

- [ ] Desktop (from `lg`): two columns. Left (about 60%): the gallery, sticky under the header while the right column scrolls. Right (max about 28rem): name (h1), category as a subtitle, price, style tiles, size grid, Add to bag, Favourite, the note "Prices include 13% VAT. Free shipping across Nepal…", description, "Colour shown" bullets, "View product details", then accordions.
- [ ] Phone and tablet (below `lg`): name, subtitle and price first, then the gallery, then the rest in the same order. There is one h1 in the page (grid placement, not a copy).
- [ ] Below the two columns, full width: "Features that perform" (when the product has features), then "You may also like".
- [ ] The phone sticky Add to bag bar (`data-sticky-cta`) stays.

Gallery

- [ ] Desktop: a vertical strip of square thumbnails (4rem) left of one large 4:5 photo. Hovering or clicking a thumbnail shows it; the shown one is marked. Previous/next round buttons sit at the bottom right of the photo ("Previous photo", "Next photo"), wrapping around. A hidden live region says "Photo {n} of {total}". The strip scrolls when there are many photos.
- [ ] Phone: one photo per screen width, swipe with scroll-snap, small dots at the bottom (hidden from screen readers), and a "Photo n of total" live region.
- [ ] One photo: no strip, no arrows, no dots.
- [ ] Picking a style shows **only that style's photos**; a style with no photos of its own shows the shared photos; a product without style photos shows all photos. The gallery goes back to the first photo when the style changes.

Style tiles, sizes, buttons

- [ ] When photos belong to styles: square picture tiles (each style's first photo, else the product's main photo), no caption; the style's name is the radio's accessible name and a tooltip-free `title`. The picked tile has an ink border. A sold-out style is dimmed with a diagonal line and stays pickable only if some size is in stock (as today: disabled when nothing is in stock).
- [ ] Without style photos: the colour chips stay as today ("Colour: {name}").
- [ ] `?style={name}` on load picks that style when it exists and has stock (else the first style with stock); picking a tile replaces the URL's `style` with `history.replaceState`. The canonical URL stays `/product/{slug}`.
- [ ] Sizes: a heading row "Select size" with "Size guide" on the right (only when the product has a size guide, `specs/size-guides.md`); a grid of size boxes (up to 5 per row on desktop); sold-out sizes stay visible, struck through and disabled. The radiogroup is named "Select size". Pressing Add to bag without a size scrolls to the sizes and shows "Select a size" as today.
- [ ] "Add to bag" is a full-width large black pill; "Favourite" under it is a full-width large outlined pill with a heart (`specs/favourites.md`). In the admin preview, Favourite only shows a toast like Add to bag.

Description and product details

- [ ] Under the buttons: the description (plain text, line breaks kept), then bullets: "Colour shown: {style}" (when the product has styles) and "Country/Region of origin: {country}" (when set).
- [ ] "View product details" (an underlined text button) opens a large popup (`Dialog size="lg"`): header with the picked style's main photo (small), the name and the price; body: description; "Benefits" (bullets, when any); "Product details" (bullets, when any, plus "Colour shown" and "Country/Region of origin"); "Care" (when set). Escape, the X and outside click close it; focus returns to the button.
- [ ] Accordions under it (native-feeling, one open at a time not required): "Delivery and returns" (today's shipping text + returns link), and "Size and fit" with a "Size guide" button when the product has a size guide.

Features that perform

- [ ] Admin: a "Features that perform" section in the product editor: up to 6 features, each with a picture (required), a title (up to 60) and text (up to 400); add, move up/down, remove; the picture is chosen with the usual uploader. Picture description optional (blank → "{product}, {title}").
- [ ] Shop: heading "Features that perform", then a row of cards (picture 4:5, title, text): 1 card per view with the next one peeking on phones (swipe), 2 on tablets, 3 on desktop; previous/next buttons above on the right from `md` (hidden when everything fits). A "Skip features" link jumps past the row for keyboard users.

Admin product details

- [ ] The editor's "Description and care" section gains: "Benefits" and "Product details" (each a textarea, one per line, up to 12 and 20 lines of 200 characters) and "Country/Region of origin" (up to 60).
- [ ] Preview shows all of it (details popup, features row) from unsaved values.

## Out of scope

- Reviews, "Complete the look", customer photos, zoom/lightbox, video, a badge line, "Style: {code}".
- The shop grid, header, bag and checkout look (next step, after the owner checks this page).

## UI

- Screens: `/product/[slug]`, `/preview/product`, admin product editor.
- New feature components in `client/features/products/`: `ProductGallery` (thumbnails + main + mobile carousel), `StyleTiles` (or the `RadioGroup swatch` variant restyled square without captions), `SizeGrid` header with Size guide, `ProductDetailsDialog`, `ProductFeatures`, `ProductAccordions`.
- Primitives: `Dialog size="lg"` (now also for the details and size guide popups: update its doc and the catalog), `RadioGroup` (`card`, `swatch`), `Accordion`, `Button`. New primitive variants need a story.
- Copy (add to `ui/content-style.md`): "Select size", "Size guide", "Colour shown: {style}", "Country/Region of origin: {country}", "View product details", "Benefits", "Product details", "Delivery and returns", "Size and fit", "Features that perform", "Skip features", "Previous photo", "Next photo", "Photo {n} of {total}", "Previous feature", "Next feature".

## Data & API

- `Product`: `benefits String[] @default([])`, `details String[] @default([])`, `countryOfOrigin String?`.
- New `ProductFeature` (`productId` cascade, `title`, `body`, `imageUrl`, `imageAlt`, `sortOrder`, timestamps; index `[productId, sortOrder]`); replaced on save like images.
- Validators: `productSchema` gains `benefits`, `details`, `countryOfOrigin`, `features` (max 6), `sizeGuideId`.
- Core: `saveProduct`, `duplicateProduct` (copies them), `getProductForEdit`, `getProductBySlug` (+ `sizeGuide`, `features`).
- `/api/v1/products/:slug` (additive): `benefits`, `details`, `countryOfOrigin`, `features`, `sizeGuide`, and image `color` (was documented, missing in code).

## Edge cases

- A style without photos, a product with one photo, no photos at all (surface placeholder), 12+ photos (strip scrolls).
- `?style=` with an unknown or sold-out style → the default style; spaces and non-ASCII names are URL-encoded.
- Old preview drafts in localStorage without the new fields → empty lists.

## Tests

- Unit: `galleryFor` (only the picked style's photos), `styleFromParam`, `toPreviewProduct` with the new fields and an old draft; validators (benefits/details/features limits); core (details and features round-trip, duplicate copies them, `getProductBySlug` returns them in order).
- E2E: storefront (gallery thumbnails switch the photo; style tile switches photos and the URL; Select size; details popup opens and closes; features row), admin (fill details and one feature, see them in the preview/shop).
