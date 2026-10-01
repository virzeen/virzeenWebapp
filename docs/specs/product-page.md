# Spec: Product page, Nike-style (with product details and "Features that perform")

**Status:** Built (2026-09-30, branch `feat/product-styles`). The admin parts (product details, features, size guide) now live in the on-page editor (`specs/product-editor-on-page.md`). The features row and "You may also like" were changed on 2026-09-30 by `specs/product-page-v2.md` (feature layouts, no carousel; two recommendation carousels).
**Owner approval:** owner, 2026-09-29 ("make it like the Nike one": https://www.nike.com/sg/t/sabrina-4-ep-basketball-shoes-SyaJY1Pc/II0403-101; product page first, the rest of the shop after they check it). Layout and interactions only: never Nike's name, logo, images or text.
**Related docs:** `specs/product-styles.md` · `specs/size-guides.md` · `specs/favourites.md` · `ui/patterns.md` §6 · `ui/content-style.md` · `backend/api-contract.md`

## Goal

A customer sees a product the way Nike shows one: a big photo with a thumbnail strip, the style tiles, a size grid with a Size guide, one large Add to bag button and a Favourite button, then the description, a "View product details" popup, and a "Features that perform" row with pictures. Picking a style (e.g. White) shows only that style's photos in the left gallery.

## User flow

1. Open `/product/{slug}` (or `/product/{slug}?style=White` from a shared link or a favourite).
2. Look through the photos: hover or tap a thumbnail (desktop) or swipe (phone).
3. Tap a style tile: the gallery, price and sizes switch to it and the address becomes `?style={name}` (no reload, no new history entry).
4. Pick a size (Size guide popup if unsure), Add to bag, or Favourite.
5. Read the description; "View product details" opens a popup with everything; scroll to "Features that perform", "You may also like" and "More from Virzeen" (the last added by `specs/product-page-v2.md`).

## Acceptance criteria

Layout

- [x] Desktop (from `lg`): two columns. Left (about 60%): the gallery, sticky under the header while the right column scrolls. Right (max about 28rem): name (h1), category as a subtitle, price, style tiles, size grid, Add to bag, Favourite, the note "Prices include 13% VAT. Free shipping across Nepal…", description, "Colour shown" bullets, "View product details", then accordions.
- [x] Phone and tablet (below `lg`): name, subtitle and price first, then the gallery, then the rest in the same order. There is one h1 in the page (grid placement, not a copy).
- [x] Below the two columns, full width: "Features that perform" (when the product has features), then "You may also like" and, since `specs/product-page-v2.md`, "More from Virzeen".
- [x] The phone sticky Add to bag bar (`data-sticky-cta`) stays. Since 2026-10-01 (owner) it is just the button, floating with no price and no background; the "Shop / {category}" breadcrumb above the name is visually hidden (still in the page for screen readers, shown on keyboard focus; BreadcrumbList data for search).

Gallery

- [x] Desktop: a vertical strip of square thumbnails (4rem) left of one large 4:5 photo. Hovering or clicking a thumbnail shows it; the shown one is marked. Previous/next round buttons sit at the bottom right of the photo ("Previous photo", "Next photo"), wrapping around. A hidden live region says "Photo {n} of {total}". The strip scrolls when there are many photos.
- [x] Phone: one photo per screen width, swipe with scroll-snap, small dots at the bottom (hidden from screen readers), and a "Photo n of total" live region.
- [x] One photo: no strip, no arrows, no dots.
- [x] Picking a style shows **only that style's photos**; a style with no photos of its own shows the shared photos; a product without style photos shows all photos. The gallery goes back to the first photo when the style changes.

Style tiles, sizes, buttons

- [x] When photos belong to styles: square picture tiles (each style's first photo, else the product's main photo), no caption; the style's name is the radio's accessible name and a tooltip-free `title`. The picked tile has an ink border. A sold-out style is dimmed with a diagonal line and stays pickable only if some size is in stock (as today: disabled when nothing is in stock).
- [x] Without style photos: the colour chips stay as today ("Colour: {name}").
- [x] `?style={name}` on load picks that style when it exists and has stock (else the first style with stock); picking a tile replaces the URL's `style` with `history.replaceState`. The canonical URL stays `/product/{slug}`.
- [x] Sizes: a heading row "Select size" with "Size guide" on the right (only when the product has a size guide, `specs/size-guides.md`); a grid of size boxes (up to 5 per row on desktop; since 2026-09-30 fewer and wider for long size names, `ui/patterns.md` §6); sold-out sizes stay visible, struck through and disabled. The radiogroup is named "Select size". Pressing Add to bag without a size scrolls to the sizes and shows "Select a size" as today.
- [x] "Add to bag" is a full-width large black pill; "Favourite" under it is a full-width large outlined pill with a heart (`specs/favourites.md`). In the admin preview, Favourite only shows a toast like Add to bag.

Description and product details

- [x] Under the buttons: the description (plain text, line breaks kept), then bullets for the picked style: "Colour shown: {colour shown}" (the style's name when none is set), "Style: {style number}" (e.g. `VZ0042-101`, `specs/product-editor-on-page.md`) and "Country/Region of origin: {country}"; a line with no value is hidden, and so is an empty list.
- [x] "View product details" (an underlined text button) opens a large popup (`Dialog size="lg"`): header with the picked style's main photo (small), the name and the price; body: description; "Benefits" (bullets, when any); "Product details" (bullets, when any, plus "Colour shown", "Style" and "Country/Region of origin"); "Care" (when set). Escape, the X and outside click close it; focus returns to the button.
- [x] Accordions under it (native-feeling, one open at a time not required): "Delivery and returns" (today's shipping text + returns link), and "Size and fit" with a "Size guide" button when the product has a size guide.

Features that perform

- [x] Admin: a "Features that perform" section in the product editor: each feature a picture (required), a title (up to 60) and text (up to 400); add, move, remove; the picture is chosen with the usual uploader. Picture description optional (blank → "{product}, {title}"). Changed by `specs/product-page-v2.md`: up to 9 features, title and text optional (blank description → "{product}" without a title), a Layout picker; was up to 6 with title and text required.
- [x] Shop: heading "Features that perform", then the features in the product's layout (`specs/product-page-v2.md`): one per row on phones, the picked grid from `md`, title and text under a picture only when present. Was (until 2026-09-30): a sideways row of cards, 1/2/3 per view, previous/next buttons from `md` and a "Skip features" link; all three are gone.

Admin product details

- [x] The editor gains (since 2026-09-30 in a box under "View product details" in the on-page editor; the origin is a bullet under the description): "Benefits" and "Product details" (each a textarea, one per line, up to 12 and 20 lines of 200 characters) and "Country/Region of origin" (up to 60).
- [x] Preview shows all of it (details popup, features row) from unsaved values.

## Out of scope

- Reviews, "Complete the look", customer photos, zoom/lightbox, video, a badge line. ("Style: {code}" was out of scope here and is now built: `specs/product-editor-on-page.md`.)
- The shop grid, header, bag and checkout look (next step, after the owner checks this page).

## UI

- Screens: `/product/[slug]`, `/preview/product`, admin product editor.
- Built in `client/features/products/` (`ui/components-catalog.md`): `ProductSelectionProvider`, `SelectedPrice`, `StyleGallery` → `ProductGallery` + `GalleryCarousel`, `StylePicker` (the `RadioGroup swatch` variant, now square without captions), `SizePicker` (with `SizeGuideDialog`), `ProductDescription` + `StyleBullets`, `ProductDetailsDialog`, `ProductAccordions`, `ProductFeatures`, `RelatedProducts` (since `specs/product-page-v2.md`: `FeatureGrid` and `ProductCarousel`).
- Primitives: `Dialog size="lg"` (now only for the details and size guide popups) with a new `media` prop, `RadioGroup swatch` (square tile), `FormField labelAside`, `Button variant="underline"`, `Accordion`. Each change has a story.
- Copy (add to `ui/content-style.md`): "Select size", "Size guide", "Colour shown: {style}", "Country/Region of origin: {country}", "View product details", "Benefits", "Product details", "Delivery and returns", "Size and fit", "Features that perform", "Previous photo", "Next photo", "Photo {n} of {total}" ("Skip features", "Previous feature" and "Next feature" went with the carousel, `specs/product-page-v2.md`); also built: "Show photo {n}" (thumbnails) and the "Units" label in the size guide.

## Data & API

- `Product`: `benefits String[] @default([])`, `details String[] @default([])`, `countryOfOrigin String?`.
- New `ProductFeature` (`productId` cascade, `title`, `body`, `imageUrl`, `imageAlt`, `sortOrder`, timestamps; index `[productId, sortOrder]`); replaced on save like images.
- Validators: `productSchema` gains `benefits`, `details`, `countryOfOrigin`, `features` (max 6; 9 since `specs/product-page-v2.md`, which also adds `featureLayout` and `featureRows`), `sizeGuideId`.
- Core: `saveProduct`, `duplicateProduct` (copies them), `getProductForEdit`, `getProductBySlug` (+ `sizeGuide`, `features`).
- `/api/v1/products/:slug` (additive): `benefits`, `details`, `countryOfOrigin`, `features`, `sizeGuide`, and image `color` (was documented, missing in code).

## Edge cases

- A style without photos, a product with one photo, no photos at all (surface placeholder), 12+ photos (strip scrolls).
- `?style=` with an unknown or sold-out style → the default style; spaces and non-ASCII names are URL-encoded.
- Old preview drafts in localStorage without the new fields → empty lists.

## Tests

- Unit: `galleryFor` (only the picked style's photos), `styleFromParam`, `toPreviewProduct` with the new fields and an old draft; validators (benefits/details/features limits); core (details and features round-trip, duplicate copies them, `getProductBySlug` returns them in order).
- E2E: storefront (gallery thumbnails switch the photo; style tile switches photos and the URL; Select size; details popup opens and closes; features row), admin (fill details and one feature, see them in the preview/shop).

## Decisions while building (2026-09-30)

- Previous/next photo buttons are the bordered `secondary` style, so they show on light photos.
- From `lg` the main photo is never taller than the screen (`max-w-gallery-photo`), so its buttons don't fall below the fold on short laptops.
- Thumbnails are named "Show photo {n}", because photos can share alt text.
- "Care" shows only in the details popup, not as an accordion on the page.
- When every style is sold out, Favourite saves the first style.
- The "Style: {name}" label stays above the tiles: it names the radio group.
- The JSON-LD `image` is the first photo's absolute address, built in `page.tsx` (the image loader is client code).
