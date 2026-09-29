# Spec: Product styles (Nike-style designs on one product page)

**Status:** Built (2026-09-29, branch `feat/product-styles`)
**Owner approval:** owner, 2026-09-29 ("Styles inside one product", chosen over separate linked products); style popup, owner 2026-09-29 ("List + popup", chosen over keeping each style on the page with only its photos in a popup)
**Related docs:** `specs/admin-product-editor.md` · `database/data-rules.md` · `ui/patterns.md` §6 · `backend/api-contract.md`

## Goal

One product page can hold 3–4 designs ("styles"), each with its own photos, price and size stock, like Nike's colourways. Customers pick a style from picture swatches and the gallery, price and sizes follow. The owner manages it all in one product editor.

## Model

A style is the variant's existing `color` value (cart, checkout, orders and stock already work per colour × size). New: `ProductImage.color` (nullable) says which style a photo shows; `null` = shared by every style (e.g. a size chart). Additive migration, nothing removed.

## User flow

1. Editor → Price and stock → **Styles** → type a name ("Mountain print") → **Add style**. Its popup opens.
2. In the popup: add its photos (many at once), its **Price (Rs)** and the stock of each size, then **Done**. The style is now a line in the list (main photo, name, price, stock, photos) with **Edit** to open the popup again. Repeat for each design.
3. Publish. The product page shows the styles as picture swatches.

## Acceptance criteria

Admin editor

- [ ] "Colours" becomes **Styles** ("Colours or designs. Each can have its own photos and price."). The main page shows the styles as a short list: each line has the style's main photo (a placeholder when it has none), its name, its price (a range with prices per size; "No price yet"), its stock for sale ("Not for sale" when no size is) and its photo count, with an **Edit** button. A style's photos never show on the main page, only in its popup.
- [ ] Adding a style opens its popup (a large `Dialog`), and so does **Edit**. The popup, titled with the style's name, holds: **Rename** (in place), **Remove style** (confirmed with a second Dialog), photos (choose or drop many, Make main, move, remove), **Price (Rs)**, and the size stock table (For sale, Stock, optional Price per size, optional SKU). Its body scrolls; **Done** stays in view. Changes go straight into the form; saving the product saves them. Closing it returns focus to the style's Edit button, or to Add style when it opened from there or the style was removed.
- [ ] After a failed save, a style with a problem says so in its line ("Something here needs fixing. Press Edit."), and focus goes there when it's the first problem on the page.
- [ ] With styles, the product-level Price field goes; each style has its own (a new style starts with the last style's price). Without styles the editor works as today.
- [ ] The main Photos section is "Photos for every style" when there are styles (optional), "Photos" otherwise.
- [ ] Renaming a style renames its rows and photos. Removing one removes its photos and unsaved rows; saved rows are switched off (past orders use them).
- [ ] Up to 12 photos per style and 60 per product.
- [ ] Preview shows styles exactly like the shop.

Shop

- [ ] When any photo belongs to a style, the colour picker becomes picture swatches (the style's first photo and its name), labelled "Style: {name}". Otherwise it stays "Colour: {name}" chips.
- [ ] Picking a style shows its photos first, then the shared ones; the price and sizes follow the style. With no style picked (all sold out) the gallery shows the shared photos, else the first style's.
- [ ] The bag, checkout and order show the photo of the style bought.
- [ ] Product cards say "{n} styles" instead of "{n} colours" when the product has style photos.

## Out of scope

- A different description or URL per style; styles as separate products; filtering the shop by style.

## UI

- New `RadioGroup` variant `swatch` (picture tile, ink border when picked, no fill) + story + catalog entry.
- `Dialog size="lg"` (new variant + `footer` slot + story): a wider popup whose body scrolls between the title and the footer. Only used for the style popup, an owner-approved exception to "forms in pages" (patterns.md §10).
- `ProductStyleList` (list, Add style, the popup) and `ProductStyleEditor` (the popup's body).
- `SelectedStyleProvider` (client context) shares the picked style between the gallery and the purchase box; the rest of the page stays server-rendered.

## Data & API

- Migration `add_product_image_color`: `ProductImage.color TEXT NULL`.
- Validators: image `color` (blank = shared); a photo's style must be one of the variant colours; images max 60.
- Core: `saveProduct` / `getProductForEdit` / `duplicateProduct` / `getProductBySlug` carry `color`; default photo descriptions name the style; cart lines and order snapshots use `imageForColor`. `/api/v1` product images gain `color` (additive).

## Tests

- Validators: image style must exist. Core: style photos saved and read; cart line image follows the style. Web unit: rename/remove style rows and photos; the list line's price range and stock (`styleSummary`); preview carries photo styles. Storybook: the large Dialog opens, and Done returns focus. E2E: admin adds two styles in their popups with their own photos and prices, the list lines sum them up, the style photo stays off the main photos; the shop page switches photo and price when the style changes.
