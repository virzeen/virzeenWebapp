# Spec: Admin product editor (WordPress-style)

**Status:** Built (2026-09-29, branch `feat/admin-product-editor`)
**Owner approval:** owner, 2026-09-29 (chose this over switching to WordPress/WooCommerce)
**Related docs:** `ui/patterns.md` §4, §10 · `database/data-rules.md` §1 (paisa) · `specs/checkout.md` (prices include shipping) · `project-brief.md` §5 (admin journey)

## Goal

The owners can list a product in a few minutes without knowing about SKUs, slugs or alt text: a two-column editor like WordPress/WooCommerce (content on the left, a Publish box on the right), many photos at once, one price for all sizes, and sizes × colours turned into a stock grid automatically. The products list works like WordPress "All products": status filters and Duplicate.

We keep our own admin (not WordPress): orders, stock, cash on delivery and the audit log already live here, and a second system would split the catalogue from checkout.

## User flow

1. Products → **New product**. Type the name. Drop or choose several photos; they upload together. The first is the main photo.
2. Write the description (care notes optional). Enter **Price** and **Shipping**; the editor shows what customers pay.
3. Type sizes (or press **S, M, L, XL** / **Free size**) and colours. A row appears for each combination; enter the stock for each.
4. In the right-hand box: choose a category (or add a new one there), tick collections, then **Publish**, or **Save draft** to finish later. A checklist shows what's still missing.
5. For a similar product: **Duplicate** (list or editor) → a draft copy opens with the same photos, text, prices and sizes, stock 0.

## Acceptance criteria

Editor layout

- [ ] At 1024px and wider the editor has two columns: main (name, photos, description, price, sizes & stock) and a sidebar (Publish box, category, collections, search engines). The sidebar stays in view while scrolling. On phones it's one column and the Publish buttons sit in a bar fixed to the bottom.
- [ ] The URL slug and search description sit in a collapsed "Search engines" section. The slug still fills itself from the name until edited.
- [ ] Publish box, draft: status "Draft", buttons **Publish** (primary) and **Save draft**. Published: status "Published", **Save** (primary), **Unpublish**, and a "View in shop" link. Toasts: "Product published", "Draft saved", "Product saved", "Product unpublished".
- [ ] Publish box checklist, live: name, at least one photo, price, category, description, at least one size/colour for sale. A warning (not a blocker) when every variant has stock 0.
- [ ] Leaving the page with unsaved changes by a link on the page (the admin menu too), reload or closing the tab asks for confirmation first. Browser Back isn't covered (Next.js has no way to stop it).
- [ ] After a save, the editor shows exactly what was saved (made SKUs, new variants), so a second save doesn't create duplicates.

Photos

- [ ] Choose several files at once, or drag them onto the photo area. They upload in parallel with one tile per file while uploading. The limits are unchanged (JPG/PNG/WebP/AVIF, 10 MB each, 12 photos); a file that fails says which one and why, and the others still upload.
- [ ] The first photo is labelled "Main photo". Each photo has **Make main**, move earlier/later and **Remove**; on desktop photos can also be dragged into order.
- [ ] Alt text is optional: blank alt text is saved as the product name ("{name}, photo 2" for the second, and so on). An optional "Photo descriptions" section lets admins write their own.

Price, sizes, colours, stock

- [ ] One **Price (Rs)** for every variant by default. Ticking "Different prices for some sizes or colours" shows a price per row.
- [ ] **Sizes** and **Colours** take values one at a time (Enter or comma adds; Enter never submits the form). Size presets: "S, M, L, XL" and "Free size".
- [ ] Every size × colour combination gets a row: a For sale checkbox named after the variant ("Black, M") and a stock input. With no sizes and no colours there is one Stock field.
- [ ] Removing a size or colour removes its unsaved rows and switches off its saved ones (they stay listed: past orders use them). Adding a value again switches the saved row back on instead of making a new one.
- [ ] SKU codes are hidden behind "Edit SKU codes". A blank SKU is made on save as `VZ-<PRODUCT>-<COLOUR>-<SIZE>` (letters and digits only, product part from the URL slug, up to 12 characters), or `VZ-<PRODUCT>-STD` with no size or colour. If another variant has it, `-2`, `-3`… is added. A blank SKU that matches one of this product's switched-off variants brings that variant back.

Products list

- [ ] Filter links "All ({n})", "Published ({n})", "Drafts ({n})" above the table, kept in the URL with the search.
- [ ] Rows show "No photos" / "Out of stock" badges where they apply, and a **Duplicate** button.
- [ ] **Duplicate** (list and editor) makes a draft named "{name} (copy)", slug "{slug}-copy" (then "-copy-2"…), same photos, description, care, category, collections, shipping and variant prices, stock 0, made SKUs, then opens it. Audited as `product.create` with `duplicatedFrom`.

Preview (owner request, approved and built 2026-09-29: new tab that updates as you edit)

- [ ] The editor has a **Preview** button (Publish box on desktop; an eye button in the bottom bar on phones). It opens the product page in a new tab, exactly as customers will see it: the shop header and footer, gallery, name, size and colour pickers with prices (product price + shipping), stock, description, care and the shipping and returns sections.
- [ ] The preview shows what's in the editor now, saved or not, and updates by itself as the admin types, adds photos or changes stock (the editor hands the draft to the preview tab in the browser; nothing is saved or sent).
- [ ] A bar across the top says "Preview: only you can see this. It updates as you edit." with **Phone size** (opens the same preview in a phone-width window) and **Close preview**. The page isn't indexed and needs the admin sign-in and two-factor step, like `/admin`.
- [ ] In the preview, Add to bag doesn't add anything; it says "This is a preview. Nothing was added to your bag."
- [ ] The shop's product page and the preview are built from one shared component, so they can't drift apart. Sizes are ordered the same way (`sortSizes` moves to `@virzeen/validators`, so the browser can use it).

## Out of scope

- Rich-text (bold/lists) descriptions, bulk edit, CSV import, scheduled publishing, per-variant photos.
- Real WordPress/WooCommerce or another CMS.

## UI

- Screens: `/admin/products`, `/admin/products/new`, `/admin/products/[id]`.
- Primitives (no new ones): `Button`, `ButtonLink`, `Input`, `Textarea`, `Select`, `Checkbox`, `FormField`, `Badge`, `Alert`, `Accordion`, `Skeleton`, `DataTable`, `toast`. Size/colour chips are `Button size="sm" variant="secondary"` with a remove icon.
- States: uploading tiles (Skeleton + file name); empty photos ("Drag photos here, or choose them. JPG, PNG, WebP or AVIF, up to 10 MB each."); errors inline per field plus the form Alert; success toasts above.

## Data & API

- Models: none changed (no migration).
- Validators: variant `sku` may be blank; image `alt` may be blank; `adminProductFiltersSchema` gets `status` (`published` | `draft`); new `duplicateProductSchema` `{ id }`.
- Core: `catalogService.saveProduct` makes blank SKUs and alt texts; new `catalogService.duplicateProduct`; `adminReads.listProducts(query, status)` + `productStatusCounts()`; `getProductForEdit` returns `updatedAt`.
- Server: `duplicateProductAction`. No `/api/v1` changes.

## Edge cases

- Colour or size with no Latin letters or digits (e.g. Nepali script) leaves that part out of the SKU; the `-2` suffix keeps it unique.
- Two products whose slugs start the same: product part is cut at 12 characters, the suffix keeps SKUs unique.
- Removing the last size (or colour) clears that part on the remaining rows instead of switching them off.
- Uploads when Cloudinary keys are missing (local): the image reference field stays as today.

## Tests

- Unit (validators): blank SKU and alt accepted; malformed SKU rejected.
- Unit (core, DB): made SKU format and suffix across products; revive by made SKU; default alt; duplicate; status filter + counts.
- Unit (web): size/colour add/remove row rules.
- E2E: `admin.spec.ts` creates a product with the new editor (name, photo, price, sizes, stock, Publish) and sees it in the shop.
