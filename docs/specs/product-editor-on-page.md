# Spec: Product editor on the page (edit it the way customers see it)

**Status:** Built (2026-09-30, branch `feat/product-styles`): `/admin/products/[id]` is the on-page editor, and the old form (`ProductForm`) is removed. Features and the products under the page were changed the same day by `specs/product-page-v2.md`. UI rules: `ui/patterns.md` §10; copy: `ui/content-style.md` "Product editor".
**Owner approval:** owner, 2026-09-29: "Make the same UI as the Preview panel in the editor… a pencil button… double click on the text or click the pencil and it will be editable… press outside and it will be automatically saved"; autosave goes live straight away ("Straight away", chosen over saving a draft copy until "Update"); every product's origin is China ("China on all"); style numbers like `VZ0042-101`.
**Replaces:** the form layout of `specs/admin-product-editor.md` (its rules on SKUs, made photo descriptions, duplicate, status filters and the products list stay). **Related:** `specs/product-page.md` · `specs/product-page-v2.md` · `specs/product-styles.md` · `specs/size-guides.md` · `ui/patterns.md` §6, §10

## Goal

The owners edit a product on a page that looks exactly like the customer's product page. Every piece of text has a pencil; double-click the text or press the pencil to edit it, click outside (or press Enter) and it saves by itself. Photos, styles, sizes, product details and features are added in place with upload and + buttons. No long form.

## User flow

1. Products → **New product** → a small popup: Name, Category, Price (Rs) → **Create draft**. The editor opens on the new draft.
2. The editor is the product page: gallery on the left, name, category, price, style tiles, sizes, buttons, description, product details, accordions, "Features that perform", "You may also like" (same category) and "More from Virzeen" (other categories, since `specs/product-page-v2.md`) below.
3. Change anything in place; it saves on its own ("Saving…" → "Saved"). When the checklist is complete, **Publish**. On a published product every change is live as soon as it saves.

## Acceptance criteria

Editing model

- [x] Every editable text shows a pencil button next to it (always visible on every screen, owner 2026-09-30: not only on hover; `aria-label="Edit {what}"`). Double-click on the text or pressing the pencil turns it into an input (textarea for long text) with the text selected. Enter (single-line) or clicking/tabbing outside saves; Escape cancels and restores. Focus returns to the pencil.
- [x] Autosave: each finished edit updates the product and saves it; one save at a time, the latest edit wins; the top bar shows "Saving…", "Saved" (with the time on hover/`title`), or "Couldn't save: {reason}" with **Try again**. A field that fails validation shows its error under it, stays open, and nothing is saved until it's fixed.
- [x] Draft: hidden from customers; **Publish** (when the checklist passes). Published: changes go live on save; **Unpublish** hides it. Leaving the page while a save is running asks first.
- [x] Drafts may be incomplete: description, photos and sizes can be missing; publishing needs a name, category, price, description, at least one photo and something for sale ("Before publishing" checklist in a popover from the status chip).

On the page (desktop and phone use the product page layout)

- [x] **Name** (h1), **category** (subtitle: pencil → select with "New category"), **price** (pencil → Rs input; with styles, the picked style's price), under it the editor-only line "Shipping Rs {n} included · Customers pay Rs {n}" with a pencil for shipping.
- [x] **Gallery**: the main photo has an upload button (icon, "Add photos", many at once, drag and drop onto it too); when there are no photos the main area is a big drop zone. The thumbnail strip ends with a **+** tile that adds photos; new photos go at the end and the + moves down. Each thumbnail on hover/focus: **Make main**, move up/down, **Remove** (asks first). With styles, the gallery and uploads belong to the picked style.
- [x] **Style tiles**: a **+** tile adds a style (name popup). The picked tile shows a pencil: rename, **Colour shown** (e.g. "Black/White", defaults to the style name), **Remove style** (asks first). Style numbers are shown read-only.
- [x] **Sizes**: the size grid with a pencil → size chips (add/remove, presets "S, M, L, XL", "Free size"); each size box shows its stock for the picked style as a small number input under it; sold-out sizes read "0". "Different prices for some sizes" moves the price input under each size.
- [x] **Add to bag / Favourite**: shown as on the shop page but inert ("Customers use these").
- [x] **Description**: pencil → textarea. Under it the bullets: "Colour shown: {colour shown}" (per style), "Style: {style number}" (read-only), "Country/Region of origin: {country}" (pencil).
- [x] **View product details** stays; right under it a box "Product details" (one per line) and "Benefits" (one per line), each editable in place; "Care" too.
- [x] Accordions: "Delivery and returns" unchanged; "Size and fit" with the size guide picker (select + "Manage size guides").
- [x] **Features that perform** (changed by `specs/product-page-v2.md`): the "Layout" picker (and the Custom rows editor), then the pictures in a simple grid, 5 per row from `lg`, each a square thumbnail with Replace picture, Move earlier/later and Remove always shown, and pencils for the title, the text (both optional) and the picture description. The **+** tile adds pictures; each is a feature, saved as soon as it's uploaded (up to 9). Was: a **+** card, and a feature wasn't saved until it had a picture, a title and text ("Not saved yet").
- [x] **You may also like** and **More from Virzeen** (changed by `specs/product-page-v2.md`): the shop's two carousels, up to 8 published products of the same category and up to 8 of the others (read-only in the editor; the same in Preview). Was: up to 4 of the same category.
- [x] Top bar (sticky): ← Products, status chip (Draft/Published), save state, **Preview** (new tab), **Settings** (sheet: URL slug, search description, collections, SKU codes and per-row prices, Duplicate, Archive), **Publish**/**Unpublish**.

Styles, colour shown, origin

- [x] Every product gets a number (`VZ0042`, never reused) and every style a style number `VZ0042-101`, `-102`… in the order styles were added; a product without styles has one style number `VZ0042-101`, and the first style it gets later keeps that -101. Style numbers never change (renaming keeps them) and are never reused, even after a style is removed.
- [x] Shop and preview show "Colour shown: {colour shown}" (e.g. "Black/White") and "Style: {style number}" for the picked style, and "Country/Region of origin: {country}" (under the description and in the details popup; a line with no value is hidden).
- [x] Every existing product's Country/Region of origin becomes "China" (all of them, not only empty ones: "China on all"); new products start with "China", and a copy of a product without one gets it too.

Later (to-do, not now)

- QR code on every style photo (links to the product with that style), used on Instagram posts; an image/QR scanner that finds Virzeen products from a photo or code.

## Out of scope

- Undo history, several admins editing the same product at once (last save wins), autosave drafts separate from the live product.

## Data & API

- `Product.number Int @unique @default(autoincrement())` (existing rows numbered by the migration).
- New `ProductStyle`: `productId` (cascade), `color` (`""` = product without styles), `code @unique`, `colourShown?`, timestamps; `@@unique([productId, color])`. Backfilled for existing products (their active colours in style order). Rows are never deleted.
- Migration `product_numbers_and_styles` (built): numbers products by `createdAt`, then id, and continues from the highest; codes use at least 4 digits (`VZ10000-101` past 9999). Backfill order per product: the `""` style first when nothing for sale has a colour, then colours for sale in shop order (`sortOrder`, then id), then colours whose variants are all switched off. It sets `countryOfOrigin = 'China'` on every product. It was edited after being applied locally (before commit); the local checksums were re-synced, nothing reset.
- `productSchema` (built): `styles: { color, colourShown?, code? }[]`, up to 20 (code echoes the stored one so renames keep it; a new style is sent with `code: ""`; leaving `colourShown` out keeps the stored one, `""` clears it); two styles with the same name, ignoring case, get "Two styles have the same name"; `description` may be empty on drafts (publishing needs it: "Add a description before publishing"); `countryOfOrigin` defaults to "China" in new products. `getProductForEdit` returns the stored origin (blank stays blank, as in the shop). Also `createDraftProductSchema` (`{ name, categoryId, pricePaisa }`) and `relatedByCategorySchema`.
- `saveProduct` (built) upserts styles (match by code, then colour exactly, then colour ignoring case, so a removed style added back as "white" keeps White's number; new ones get the next suffix; if a rename takes the name of an unused style row, that row becomes "{name} ({code})") and returns `SavedProduct = { id, slug, savedAt, values }`, where `values` are the editor's values read in the same transaction (variant ids, made SKUs and photo descriptions, style codes). `getProductBySlug`/`getProductForEdit`/`duplicateProduct` carry styles (a duplicate gets new numbers, copies colour shown). `catalogService.createDraft` goes through `saveProduct` (audited as `product.create`).
- Admin actions (built): `listRecommendationsAction({ categoryId, excludeId? })` for the editor and Preview (replaced `listRelatedByCategoryAction`, `specs/product-page-v2.md`); `createDraftProductAction` → `{ id }`; `saveProductAction` → `SavedProduct`; `duplicateProductAction` now returns `{ id, slug }`.
- `/api/v1/products/:slug`: `styles: { color, code, colourShown }[]` (additive, built).

## Tests

- Core: numbers and style codes (backfill shape, next suffix, rename keeps code, removed style keeps its code, duplicate gets new codes), draft without description saves, publish without it fails, save returns ids.
- Web unit: autosave queue (one in flight, latest wins, error state), EditableText key handling (pure parts).
- E2E: new product via the popup; edit name in place (double-click, type, click outside → "Saved"), add a photo with +, add a style and set its colour shown, set stock in the size grid, publish; shop shows "Colour shown", "Style: VZ…-101" and origin China; Preview and editor show "You may also like".

## Decisions while building (2026-09-30)

- **Photo buttons** (Make main, move earlier/later, Remove) sit on the main photo, under it on phones, and act on the photo shown there: a 4rem thumbnail can't hold four 44px buttons. Hovering or clicking a thumbnail shows that photo. They are named "Move photo {n} earlier/later" ("Move Black photo 2 earlier" with styles).
- **Style pencil** sits beside "Style: {name}" (the label of the tiles), and double-clicking a tile opens "Edit style" too.
- **Late uploads** land on the style they were started for, at the end, and follow a rename made meanwhile; they are dropped if the style was removed.
- **Style numbers**: a product's first style takes over the "no style" number (-101), and a style added back (in any case) gets its old entry and number.
- A style with no photos of its own shows the shared photos with a note, or the drop zone when there are none: never another style's photos.
- A switched-off size row shows "Not for sale" instead of a stock box. With "Different prices for some sizes" on, a product without sizes gets one price box too.
- Without Cloudinary keys (local), "Add photos" opens a small popup with "Image reference" and "Add photo".
- The **slug** follows the name until the product is first published or the slug is typed by hand; a clash on a made slug retries with -2, -3 (up to 5 tries).
- **Publish** checks the whole product first: with something missing it opens the checklist; with another problem it saves as it is, so the problems show on their fields.
- SKU boxes and "View in shop" are in Settings.
- A save with no changes sends nothing.
- **Features** wrap into rows (1, 2 or 3 per row) instead of the shop's sideways row, so each card can be edited; they move earlier/later; only one new feature exists at a time; each card has a "Picture description" line, the only place to edit it. (Replaced by `specs/product-page-v2.md`: a simple grid of square thumbnails, 5 per row from `lg`, and a feature is saved with just its picture.)
- "Size and fit" is always shown and open in the editor (with "No size guide. Customers don't see Size and fit." when none is picked).
- The details popup ("View product details") is built from the editor's current values, for the picked style.
- "You may also like" links open in a new tab.
- **Made descriptions** (photos and feature pictures) are shown blank and cleared when the product is renamed, a photo is moved or removed, a style is renamed or a feature title changes, so the next save makes them again. A finished save only fills a description that was blank when it was sent.
- A new size's rows take their own style's price.
- An unfinished feature makes leaving the page ask first, in the same one check as unsaved edits. (Gone with `specs/product-page-v2.md`: a feature is saved as soon as its picture is in, so there are no unfinished ones.)
- The checklist item is "Something for sale" (was "Something ticked For sale": the editor has no For sale tick). The Preview's empty state says "Nothing is for sale."
