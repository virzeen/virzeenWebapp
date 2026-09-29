# Spec: Product editor on the page (edit it the way customers see it)

**Status:** Approved
**Owner approval:** owner, 2026-09-29: "Make the same UI as the Preview panel in the editor… a pencil button… double click on the text or click the pencil and it will be editable… press outside and it will be automatically saved"; autosave goes live straight away ("Straight away", chosen over saving a draft copy until "Update"); every product's origin is China ("China on all"); style numbers like `VZ0042-101`.
**Replaces:** the form layout of `specs/admin-product-editor.md` (its rules on SKUs, made photo descriptions, duplicate, status filters and the products list stay). **Related:** `specs/product-page.md` · `specs/product-styles.md` · `specs/size-guides.md` · `ui/patterns.md` §6, §10

## Goal

The owners edit a product on a page that looks exactly like the customer's product page. Every piece of text has a pencil; double-click the text or press the pencil to edit it, click outside (or press Enter) and it saves by itself. Photos, styles, sizes, product details and features are added in place with upload and + buttons. No long form.

## User flow

1. Products → **New product** → a small popup: Name, Category, Price (Rs) → **Create draft**. The editor opens on the new draft.
2. The editor is the product page: gallery on the left, name, category, price, style tiles, sizes, buttons, description, product details, accordions, "Features that perform" and "You may also like" (same category) below.
3. Change anything in place; it saves on its own ("Saving…" → "Saved"). When the checklist is complete, **Publish**. On a published product every change is live as soon as it saves.

## Acceptance criteria

Editing model

- [ ] Every editable text shows a pencil button next to it (visible on hover and keyboard focus from `md`, always visible on phones; `aria-label="Edit {what}"`). Double-click on the text or pressing the pencil turns it into an input (textarea for long text) with the text selected. Enter (single-line) or clicking/tabbing outside saves; Escape cancels and restores. Focus returns to the pencil.
- [ ] Autosave: each finished edit updates the product and saves it; one save at a time, the latest edit wins; the top bar shows "Saving…", "Saved" (with the time on hover/`title`), or "Couldn't save: {reason}" with **Try again**. A field that fails validation shows its error under it, stays open, and nothing is saved until it's fixed.
- [ ] Draft: hidden from customers; **Publish** (when the checklist passes). Published: changes go live on save; **Unpublish** hides it. Leaving the page while a save is running asks first.
- [ ] Drafts may be incomplete: description, photos and sizes can be missing; publishing needs a name, category, price, description, at least one photo and something for sale ("Before publishing" checklist in a popover from the status chip).

On the page (desktop and phone use the product page layout)

- [ ] **Name** (h1), **category** (subtitle: pencil → select with "New category"), **price** (pencil → Rs input; with styles, the picked style's price), under it the editor-only line "Shipping Rs {n} included · Customers pay Rs {n}" with a pencil for shipping.
- [ ] **Gallery**: the main photo has an upload button (icon, "Add photos", many at once, drag and drop onto it too); when there are no photos the main area is a big drop zone. The thumbnail strip ends with a **+** tile that adds photos; new photos go at the end and the + moves down. Each thumbnail on hover/focus: **Make main**, move up/down, **Remove** (asks first). With styles, the gallery and uploads belong to the picked style.
- [ ] **Style tiles**: a **+** tile adds a style (name popup). The picked tile shows a pencil: rename, **Colour shown** (e.g. "Black/White", defaults to the style name), **Remove style** (asks first). Style numbers are shown read-only.
- [ ] **Sizes**: the size grid with a pencil → size chips (add/remove, presets "S, M, L, XL", "Free size"); each size box shows its stock for the picked style as a small number input under it; sold-out sizes read "0". "Different prices for some sizes" moves the price input under each size.
- [ ] **Add to bag / Favourite**: shown as on the shop page but inert ("Customers use these").
- [ ] **Description**: pencil → textarea. Under it the bullets: "Colour shown: {colour shown}" (per style), "Style: {style number}" (read-only), "Country/Region of origin: {country}" (pencil).
- [ ] **View product details** stays; right under it a box "Product details" (one per line) and "Benefits" (one per line), each editable in place; "Care" too.
- [ ] Accordions: "Delivery and returns" unchanged; "Size and fit" with the size guide picker (select + "Manage size guides").
- [ ] **Features that perform**: each card's picture has an upload button, title and text have pencils, move/remove on hover/focus; a **+** card adds one (picture first, then title and text). A feature isn't saved until it has a picture, a title and text ("Not saved yet").
- [ ] **You may also like**: up to 4 published products of the same category (read-only in the editor; the same section in Preview).
- [ ] Top bar (sticky): ← Products, status chip (Draft/Published), save state, **Preview** (new tab), **Settings** (sheet: URL slug, search description, collections, SKU codes and per-row prices, Duplicate, Archive), **Publish**/**Unpublish**.

Styles, colour shown, origin

- [ ] Every product gets a number (`VZ0042`, never reused) and every style a style number `VZ0042-101`, `-102`… in the order styles were added; a product without styles has one style number `VZ0042-101`. Style numbers never change (renaming keeps them) and are never reused, even after a style is removed.
- [ ] Shop and preview show "Colour shown: {colour shown}" (e.g. "Black/White") and "Style: {style number}" for the picked style, and "Country/Region of origin: {country}".
- [ ] Every existing product's Country/Region of origin becomes "China"; new products start with "China".

Later (to-do, not now)

- QR code on every style photo (links to the product with that style), used on Instagram posts; an image/QR scanner that finds Virzeen products from a photo or code.

## Out of scope

- Undo history, several admins editing the same product at once (last save wins), autosave drafts separate from the live product.

## Data & API

- `Product.number Int @unique @default(autoincrement())` (existing rows numbered by the migration).
- New `ProductStyle`: `productId` (cascade), `color` (`""` = product without styles), `code @unique`, `colourShown?`, timestamps; `@@unique([productId, color])`. Backfilled for existing products (their active colours in style order). Rows are never deleted.
- Migration also sets `countryOfOrigin = 'China'` where empty.
- `productSchema`: `styles: { color, colourShown?, code? }[]` (code echoes the stored one so renames keep it); `description` may be empty on drafts (publishing needs it); `countryOfOrigin` defaults to "China" in new products.
- `saveProduct` upserts styles (match by code, then color; new ones get the next suffix) and returns what the editor needs to keep saving (ids of variants, style codes, slug). `getProductBySlug`/`getProductForEdit`/`duplicateProduct` carry styles (a duplicate gets new numbers, copies colour shown).
- `listRelatedByCategoryAction({ categoryId, excludeId? })` (admin) for the editor and Preview.
- `/api/v1/products/:slug`: `styles: { color, code, colourShown }[]` (additive).

## Tests

- Core: numbers and style codes (backfill shape, next suffix, rename keeps code, removed style keeps its code, duplicate gets new codes), draft without description saves, publish without it fails, save returns ids.
- Web unit: autosave queue (one in flight, latest wins, error state), EditableText key handling (pure parts).
- E2E: new product via the popup; edit name in place (double-click, type, click outside → "Saved"), add a photo with +, add a style and set its colour shown, set stock in the size grid, publish; shop shows "Colour shown", "Style: VZ…-101" and origin China; Preview and editor show "You may also like".
