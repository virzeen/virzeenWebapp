# Spec: Product styles (Nike-style designs on one product page)

**Status:** Built (2026-09-29, branch `feat/product-styles`)
**Owner approval:** owner, 2026-09-29 ("Styles inside one product", chosen over separate linked products); the popup was then dropped the same day: the owner meant a popup on the customer side, and wants each style inline in the editor as a card with its photo on the left and size, price and shipping on the right (`specs/product-page.md`)
**Related docs:** `specs/admin-product-editor.md` · `database/data-rules.md` · `ui/patterns.md` §6 · `backend/api-contract.md`

## Goal

One product page can hold 3–4 designs ("styles"), each with its own photos, price and size stock, like Nike's colourways. Customers pick a style from picture swatches and the gallery, price and sizes follow. The owner manages it all in one product editor.

## Model

A style is the variant's existing `color` value (cart, checkout, orders and stock already work per colour × size). New: `ProductImage.color` (nullable) says which style a photo shows; `null` = shared by every style (e.g. a size chart). Additive migration, nothing removed.

## User flow

1. Editor → Price and stock → **Styles** → type a name ("Mountain print") → **Add style**. A card appears for it.
2. In the card: its photos on the left (the main one large, the others as small tiles, add many at once); on the right its **Price (Rs)** with the shipping and "Customers pay …" line, and the stock of each size. Repeat for each design.
3. Publish. The product page shows the styles as picture swatches.

## Acceptance criteria

Admin editor

- [ ] "Colours" becomes **Styles** ("Colours or designs. Each can have its own photos and price."). Each style is an inline card (`<section>` named by its h3): header with the name, **Rename** (in place) and **Remove style** (confirmed with a Dialog); body in two columns from `md`: left, the style's photos (main photo large with "Main photo", the rest as tiles; choose or drop many, Make main, move, remove); right, **Price (Rs)**, the product's shipping shown read-only ("Shipping Rs 150, the same for every style") with "Customers pay Rs …", then the size stock table (For sale, Stock, optional Price per size, optional SKU). One column on phones (photos first).
- [ ] With styles, the product-level Price field goes; each style has its own (a new style starts with the last style's price). Without styles the editor works as today.
- [ ] The main Photos section is "Photos for every style" when there are styles (optional), "Photos" otherwise.
- [ ] Renaming a style renames its rows and photos. Removing one removes its photos and unsaved rows; saved rows are switched off (past orders use them).
- [ ] Up to 12 photos per style and 60 per product.
- [ ] Preview shows styles exactly like the shop.

Shop

- [ ] When any photo belongs to a style, the colour picker becomes picture swatches (the style's first photo and its name), labelled "Style: {name}". Otherwise it stays "Colour: {name}" chips.
- [ ] Picking a style shows only its photos (Nike-style, `specs/product-page.md`); a style without photos shows the shared ones; the price and sizes follow the style. With no style picked (all sold out) the gallery shows the shared photos, else the first style's.
- [ ] The bag, checkout and order show the photo of the style bought.
- [ ] Product cards say "{n} styles" instead of "{n} colours" when the product has style photos.

## Out of scope

- A different description or URL per style; styles as separate products; filtering the shop by style.

## UI

- New `RadioGroup` variant `swatch` (picture tile, ink border when picked, no fill) + story + catalog entry.
- `ProductStyleCard` (inline card: photos left, price/shipping/stock right) with `ProductPhotos layout="stacked"` for the narrow photo column.
- `SelectedStyleProvider` (client context) shares the picked style between the gallery and the purchase box; the rest of the page stays server-rendered.

## Data & API

- Migration `add_product_image_color`: `ProductImage.color TEXT NULL`.
- Validators: image `color` (blank = shared); a photo's style must be one of the variant colours; images max 60.
- Core: `saveProduct` / `getProductForEdit` / `duplicateProduct` / `getProductBySlug` carry `color`; default photo descriptions name the style; cart lines and order snapshots use `imageForColor`. `/api/v1` product images gain `color` (additive).

## Tests

- Validators: image style must exist. Core: style photos saved and read; cart line image follows the style. Web unit: rename/remove style rows and photos; preview carries photo styles; `galleryFor` shows only the picked style's photos. E2E: admin adds two styles in their cards with their own photos and prices; the style photo stays off the main photos; the shop page switches photo and price when the style changes.
