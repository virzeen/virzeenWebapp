# Spec: Size guides

**Status:** Built (2026-09-30, branch `feat/product-styles`). The product's picker now lives in the on-page editor's "Size and fit" (`specs/product-editor-on-page.md`), not in Organise. Types (Clothing: a size table; Accessories: one size chart picture), the spreadsheet-like table editor and the popup's new look came on 2026-09-30 with `specs/product-page-v2.md`.
**Owner approval:** owner, 2026-09-29 ("Charts made in admin", chosen over a picture per product or one chart for the shop)
**Related docs:** `specs/product-page.md` · `specs/product-page-v2.md` · `ui/patterns.md` §6, §10 · `database/data-rules.md`

## Goal

The owner makes a size chart once (e.g. "T-shirts": sizes × Chest, Length, Sleeve in cm), picks it on each product, and customers open it from "Size guide" on the product page as a popup with a cm/inch switch.

## User flow

1. Admin → Size guides → New size guide: type (since `specs/product-page-v2.md`: Clothing or Accessories), name, then for Clothing the size table (measurements as columns, one row per size with the values in cm; templates and paste from a spreadsheet) or for Accessories the size chart picture, optional intro, fit tips, how-to-measure text and picture → Save.
2. Product editor → "Size and fit" → pencil → pick the guide (it saves by itself).
3. Customer → product page → "Size guide" → popup: the table (cm or in) or, for Accessories, the picture; fit tips, how to measure.

## Acceptance criteria

Admin

- [x] Nav item "Size guides" (after Collections), page `/admin/size-guides` with a list (name, number of products using it, Edit, Archive) and "New size guide"; create/edit at `/admin/size-guides/new` and `/admin/size-guides/{id}` (forms in pages).
- [x] Form: Name (required, up to 60, unique among active guides), Intro (optional, up to 500), Measurements: 1–6 column names (e.g. Chest, up to 30 each), Sizes: 1–20 rows, each a size name (up to 20) and one value per measurement (numbers or ranges in cm, e.g. "96" or "96-101", up to 20 characters; blank allowed), add/remove/move rows and columns; "Fit tips" (optional, up to 500); "How to measure" (optional, one tip per line, up to 10 lines of 200); a how-to-measure picture (optional, with description). Changed by `specs/product-page-v2.md`: a "Type" choice comes first; the measurements and sizes are one grid like a spreadsheet (names in the header cells, a menu on each column and row, paste from Excel or Google Sheets, templates), with the customer's popup shown live beside it; an Accessories guide has a required size chart picture and no table. Was: a Measurements list and a separate Sizes table.
- [x] Archive asks first; when products still use the guide it refuses: "1 product uses this size guide. Pick another guide on it first." / "{n} products use this size guide. Pick another guide on them first."
- [x] Product editor → "Size and fit" (always shown in the editor): pencil → "Size guide" select ("No size guide" + active guides), with a link "Manage size guides". (Was Organise in the old form.)
- [x] Every save and archive is audited (`sizeGuide.create|update|archive`).

Shop

- [x] "Size guide" (ruler icon + text button) next to "Select size" only when the product has an active guide; also inside the "Size and fit" accordion. Since 2026-10-01 (owner) a product without sizes (e.g. a vase in Mini and Grande) has it on the right of "Style: {name}" instead.
- [x] It opens `Dialog size="lg"` titled "Size guide" with the guide's name under it: the intro, a units switch "cm | in" (radio group, cm first; since `specs/product-page-v2.md` a joined switch at the top right, and the Size column is pinned), the table (first column "Size", then each measurement with its unit, e.g. "Chest (cm)"), "Fit tips", "How to measure" (list) and the picture. Inches are worked out from cm (÷ 2.54, rounded to the nearest 0.5), ranges and numbers inside text converted, anything else shown as typed. An Accessories guide shows its picture across the popup instead, and no units switch (`specs/product-page-v2.md`). Since 2026-10-01 (owner: "shows only the picture") that popup shows just the picture: the title and the guide's name are read by screen readers but not shown (`Dialog hideTitle`), and "Open full size" is gone. An intro, fit tips or how-to-measure the owner typed still show under it.
- [x] The table scrolls sideways inside the popup on narrow phones; it has a caption, `th scope="col"` headers and `th scope="row"` sizes.
- [x] The unit choice is remembered for the visit (sessionStorage, optional).

## Out of scope

- A default guide per category, several charts per guide, body vs garment toggles, shoe sizes.

## Data & API

- New `SizeGuide`: `name`, `intro?`, `chart Json` (`{ columns: string[], rows: { size: string, values: string[] }[] }`, validated by `sizeChartSchema` / `parseSizeChart` on read; `Json?` since `specs/product-page-v2.md`, which adds `kind SizeGuideKind @default(CHART)`, and null for an Accessories guide, whose `imageUrl` is the size chart picture), `fitTips?`, `howToMeasure String[] @default([])`, `imageUrl?`, `imageAlt?`, `archivedAt?`, timestamps; index `[archivedAt]`.
- `Product.sizeGuideId String?` → `SizeGuide` (`onDelete: Restrict`), indexed.
- Validators: `sizeGuideSchema` (since `specs/product-page-v2.md` with `kind`: its input is the form's `SizeGuideFormValues`, its output `SizeGuideInput`, a union on `kind` with `chart` null for Accessories), `SIZE_GUIDE_KINDS`, `SIZE_GUIDE_KIND_LABELS`, `saveSizeGuideSchema` (`{ id?, guide }`), `sizeChartSchema`, `parseSizeChart`; `productSchema.sizeGuideId`; upload folder `size-guides`.
- Core: `catalogService.saveSizeGuide`, `archiveSizeGuide`; `adminReads.listSizeGuides`, `getSizeGuideForEdit`, `listSizeGuideOptions` (guides with an invalid chart, or Accessories guides without a picture, left out; all three return `kind`); `saveProduct` checks the guide exists and isn't archived ("Choose a size guide"); `duplicateProduct` keeps it; `getProductBySlug` returns it (null when archived or invalid).
- `/api/v1/products/:slug`: `sizeGuide: { kind, name, intro, chart, fitTips, howToMeasure, imageUrl, imageAlt } | null` (additive; `kind` and a null `chart` for Accessories since `specs/product-page-v2.md`).

## Tests

- Unit: `sizeChartSchema` (row width must match columns, limits), `toInches` ("96" → "38", "96-101" → "38 - 40", "Free" unchanged).
- Core: save/update/archive (refused while used), product save rejects an archived guide, `getProductBySlug` includes the guide.
- E2E: admin creates a guide and picks it on the product; the product page's Size guide opens the popup, switches to inches and closes.

## Decisions while building (2026-09-30)

- The units switch has a visible label "Units"; the table's caption (for screen readers) reads "{guide}, sizes in centimetres" or "…inches".
- A picture with no description is read as "How to measure". (Since `specs/product-page-v2.md`, an Accessories guide's size chart picture reads "{name} size chart".)
- "Size and fit" shows the guide's fit tips above its "Size guide" button.
- Unique names are checked in core only (no database index); `SizeGuide.name` is also sorted without an index (`database/data-rules.md` §1 note). The table stays tiny.
- A product whose guide has an invalid stored chart shows no Size guide in the shop, and the editor says "This size guide can't be shown. Choose another."
