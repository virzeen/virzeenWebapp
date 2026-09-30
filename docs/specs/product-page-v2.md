# Spec: Feature layouts, picture-only features, recommendation carousels, size guide types

**Status:** Built (2026-09-30, branch `feat/product-styles`)
**Owner approval:** owner, 2026-09-30. Features: "put the grid option, 6 grids options… some want full width, some one full portrait height and then horizontal… make them as the options"; recommendations: "Two rows"; size guides: "Pick a type per guide"; adding a feature: "No need to add the title and the text… only the picture can also save automatically".
**Changes:** `specs/product-page.md` (features row, "You may also like") · `specs/product-editor-on-page.md` (features, related) · `specs/size-guides.md` (types, chart editor, popup)
**Related docs:** `ui/patterns.md` §6, §10 · `ui/content-style.md` · `backend/api-contract.md`

## Goal

The owner picks how "Features that perform" is laid out (seven grids or custom rows, no carousel), a feature can be just a picture and saves as soon as it's uploaded, customers always see more products to browse in two carousels, and size guides are either a full size table (clothing, with an easier editor) or one size chart picture (accessories).

## User flow

1. Editor → "Features that perform" → "Layout" → pick one of seven or build Custom rows (saves by itself) → + tile → upload pictures → the feature is saved and live (title and text can be added later with the pencils, or never).
2. Customer → product page → features in the picked grid → "You may also like" (same category) carousel → "More from Virzeen" (other categories) carousel.
3. Admin → Size guides → New → Type: "Clothing" (size table) or "Accessories" (picture) → Clothing: start from a template or blank, fill the table like a spreadsheet (or paste from Excel/Google Sheets), see the customer's popup beside it → Save. Accessories: upload the size chart picture → Save.
4. Customer → "Size guide" → Clothing: the table (cm | in); Accessories: the picture, large.

## Acceptance criteria

Features that perform

- [x] `Product.featureLayout`, default "Three across". Seven ready-made layouts plus **Custom** (owner, 2026-09-30). Shapes from `md`; on phones every layout is one picture per row, pictures 4:5 except landscape ones:
  - **Three across**: 3 per row from `lg` (2 at `md`), pictures 4:5. Never one picture alone on a row: 7 → 3, 2, 2; 8 → 3, 3, 2; 4 → 2, 2; one feature → full width 16:9; at `md` a lone last picture spans the row.
  - **Three + two**: in groups of five: three 4:5 pictures in a row, then two 16:9 side by side. Left over: 3 or 4 → three across, then the rest as below; 2 → two 16:9 side by side; 1 → full width 16:9.
  - **Two across**: 2 per row, pictures 4:5 (a lone last one full width).
  - **Full width**: one per row, pictures 16:9.
  - **Tall + two**: in groups of three: a tall picture on the left as high as the two wide ones stacked on the right.
  - **Two + tall**: the same, tall on the right.
  - **Wide + two**: in groups of three: one full-width picture (16:9), then two side by side (4:5).
  - Grouped layouts with 1 or 2 left over show them full width / two across.
  - **Custom**: the owner builds the rows, top to bottom (owner: "1 horizontal, 2 vertical and 4 in one row"). Each row: how many pictures (1, 2, 3 or 4) and their shape, **Landscape** (16:9) or **Portrait** (4:5); rows move up/down and are removed; "+ Add row" (up to 9 rows); a new row is 2 portrait. Pictures fill the rows in order; when there are more pictures than the rows hold, the last row's pattern repeats; a row with fewer pictures left than its count shares its width among them. A line says "These rows hold {n} pictures. You have {m}." Custom with no rows looks like Three across. Rows of 4 show 2 + 2 at `md`. The rows are kept when another layout is picked, so switching back restores them.
- [x] Shop and Preview: no carousel, no previous/next buttons and no "Skip features" link; title and text show under each picture only when present (a picture-only feature is just the picture).
- [x] Editor (owner, 2026-09-30: "it doesn't need to be like the preview grid, just 5 pictures per row; only the Preview is like the grid"): the "Layout" picker (radio group, each choice a small drawing plus its name; picking one saves at once; with Custom picked, the rows editor under it), then the pictures in a **simple grid, 5 per row from `lg`** (3 at `md`, 2 on phones), in list order, each a square thumbnail with Replace picture, Move earlier / Move later (← →) and Remove always visible, and under it the title, text and picture description pencils. The layout itself shows only in Preview and the shop; a hint next to the picker says "See the layout in Preview."
- [x] The **+ tile** is the last cell of that grid (right of the last picture), the same size as a thumbnail, dashed, with the + icon and "Add feature"; the **whole tile** opens the file picker (click, Enter or Space) and takes a dropped picture; several pictures at once add several features (up to the limit). Hidden when the list is full.
- [x] Up to **9** features ("Add up to 9 features"; counter "{n} of 9").
- [x] **Drag to reorder** (owner, 2026-09-30: "we can drag and make the position of the photo"): in the editor grid, drag a feature picture to a new place with the mouse, or press and hold then drag on a touch screen; the other pictures make room as it moves, and dropping saves the new order at once (autosave), like Move earlier / Move later. A small drag handle on each picture shows it can be dragged (the whole picture drags, except its buttons). The ← → buttons stay for keyboard and screen reader users (WCAG 2.5.7); after a drop, screen readers hear "Moved {name} to position {n} of {total}". The page scrolls while a picture is dragged near the top or bottom edge. Library: `@dnd-kit/core` + `@dnd-kit/sortable` (touch and pointer support, which native HTML drag and drop lacks on phones).
- [x] A feature needs only a picture: + → upload → it joins the list and autosaves straight away. Title (up to 60) and text (up to 400) are optional; the pencils read "Add a title (optional)" / "Add text (optional)". "Not saved yet" and the leave check for an unfinished feature go away.
- [x] Blank picture description → "{product}, {title}", or "{product}" when the title is blank.

Recommendations

- [x] Under the product (shop, Preview, editor), two carousels, each hidden when empty: "You may also like" = published products of the same category (newest first, up to 8, not this one); "More from Virzeen" = published products of other categories (newest first, up to 8).
- [x] Carousel: heading left, previous/next round buttons right from `md` (disabled at the ends, hidden when all cards fit); a sideways row with snap showing only whole cards: 2 per view on phones, 3 at `md`, 4 at `lg` (owner, 2026-09-30: "4 unit whole"); previous/next move **one card** at a time (owner: "1 card 1 card"); swipe / trackpad / arrow keys scroll it (the row takes focus); "Previous products" / "Next products" labels; reduced motion → no smooth scrolling.
- [x] In the editor the cards open in a new tab (as now).

Size guides

- [x] `SizeGuide.kind`: "Clothing" (size table, default, existing guides) or "Accessories" (picture). Chosen at the top of the form as two large radio cards; switching back and forth doesn't lose what's typed until Save.
- [x] Accessories: "Size chart picture" upload is required ("Upload the size chart picture"), with an optional description (blank → "{name} size chart"). No table is stored (`chart` null). Intro, fit tips and how-to-measure stay optional.
- [x] Clothing editor, one grid like a spreadsheet: measurement names are the header cells (typed in place), each column has a small menu (Move left, Move right, Remove); "+ Measurement" adds a column (up to 6), "+ Size" adds a row (up to 20); each row moves up/down and removes; Enter goes down a column, Tab goes across; pasting a block copied from Excel or Google Sheets fills the grid from that cell, adding rows and columns as needed (within the limits; extra cells are dropped with a toast saying so). The Size column stays in view when the grid scrolls sideways.
- [x] Templates when the table is empty (new guide), and "Start from a template" later (asks before replacing): "Tops" (Chest, Length, Sleeve · XS–XXL), "Bottoms" (Waist, Hip, Inseam · XS–XXL), "Blank". Template values are left blank for the owner to fill.
- [x] "What customers see": the popup's content, live, beside the editor from `xl` (under it on smaller screens; see Decisions).
- [x] Popup (customers), Clothing: units switch "cm | in" top right as a compact segmented control; table with the Size column pinned while scrolling sideways, row lines, the hovered/focused row highlighted; then Fit tips and How to measure (tips and picture side by side from `md`). Accessories: the picture full width of the popup (whole picture visible, "Open full size" opens it in a new tab); intro, fit tips and how to measure when present; no units switch.
- [x] Admin size guides list shows each guide's type.

## Out of scope

- Per-feature sizes or layouts, reordering recommendations by hand, "recently viewed", several pictures per accessories guide, OCR of a picture into a table.

## Data & API

- Prisma: `enum FeatureLayout { THREE TWO FULL TALL_LEFT TALL_RIGHT WIDE_TOP }`, `Product.featureLayout FeatureLayout @default(THREE)`; `enum SizeGuideKind { CHART PICTURE }`, `SizeGuide.kind SizeGuideKind @default(CHART)`, `SizeGuide.chart Json?` (migration `feature_layout_and_size_guide_kind`). Then a second additive migration `feature_layout_custom_rows`: `THREE_TWO` (after `THREE`) and `CUSTOM` added to `FeatureLayout`, and `Product.featureRows Json @default("[]")` (`{ count: 1–4, shape: "LANDSCAPE" | "PORTRAIT" }[]`, up to 9, validated by `featureRowsSchema` on save and parsed defensively on read).
- Validators: `FEATURE_LAYOUTS`, `FEATURE_LAYOUT_LABELS` (+ "Three + two", "Custom"), `productSchema.featureLayout`, `productSchema.featureRows`, `featureRowsSchema`, features max 9; `productFeatureSchema` title/body may be blank; `SIZE_GUIDE_KINDS`, `SIZE_GUIDE_KIND_LABELS` ("Clothing", "Accessories"), `sizeGuideSchema` with `kind` (Clothing needs a valid chart; Accessories needs the picture, its chart is dropped).
- Core: `saveProduct`/`duplicateProduct`/`getProductForEdit`/`getProductBySlug` carry `featureLayout`; made feature alt as above; `saveSizeGuide` stores kind (chart null for Accessories); reads return `kind` and `chart | null` (an Accessories guide without a picture, or a Clothing guide with an invalid chart, is hidden); `catalogReads.listRecommendations({ categoryId, excludeId?, limit = 8 })` → `{ sameCategory, otherCategories }`.
- Server: `listRecommendationsAction` (admin: editor and Preview) replaces `listRelatedByCategoryAction`; `listRecommendations(product)` query for the shop page replaces `listRelatedProducts`.
- `/api/v1/products/:slug` (additive): `featureLayout`; feature `title`/`body` may be ""; `sizeGuide.kind`, `sizeGuide.chart` may be null.

## Tests

- Validators: layouts enum, blank feature title/body, size guide kinds (Clothing without chart fails, Accessories without picture fails, Accessories drops the chart).
- Core: featureLayout round-trip and duplicate, made alt with blank title, Accessories guide save/read, `listRecommendations` (same category excludes this product; other categories exclude this category; published only; limit).
- Web unit: layout grouping (groups of three with remainders), paste parsing (tabs/newlines, limits), templates.
- E2E: editor picks a layout and adds a picture-only feature (shop shows it in that layout); product page shows both carousels; admin makes an Accessories guide, picks it, the popup shows the picture.

## Decisions while building (2026-09-30)

Features

- **Layouts from `md`** are a 12-column grid (`featureTiles` in `feature-layout.ts`, drawn by `FeatureGrid`). Any picture that spans a whole row in a ready-made layout is 16:9. "Three + two" stays three across at `md`. In Custom, rows of 3 stay 3 across at `md`; only a row of 4 becomes 2 + 2.
- **Phones**: one picture per row, 16:9 when the tile is landscape, else 4:5 (a tall one too). So the stacked pair in "Tall + two", the wide picture in "Wide + two" and the pair in "Three + two" are 16:9 on phones.
- "Two + tall" lists the two stacked pictures first, then the tall one; that is also their order on phones. The tall and stacked columns are equal width.
- A tall picture never gets shorter than the two 16:9 pictures beside it (`FeatureFrame` holds an 8:9 spacer from `md`). Long text makes the rows taller instead, which can leave space under the stacked pair.
- When no feature has a title or text, rows sit 16px apart, like the columns; otherwise 32px.
- Open question for the owner: a single portrait picture left in a Custom row is full width at 4:5, very tall on large screens. It follows the rules above.
- **Layout picker**: 2 per row on phones, 4 from `sm`, all 8 in one row only from `xl` (8 across left about 85px each at 1024px beside the admin menu). "See the layout in Preview." is its helper.
- **Rows editor**: one box per row, "Row {n}", with "Pictures" (1–4) and "Shape" radio groups (screen readers: "Pictures in row 2", "Shape of row 2"), and Move up, Move down, Remove, always shown. Removing a row doesn't ask: no pictures are lost. "Add row" is disabled at 9 with "Add up to 9 rows." beside it. The count line is read out when it changes; one row reads "This row holds {n} picture(s).", no rows "No rows yet, so the features show as Three across." Every change saves at once through `commitField("featureRows", rows)`. Focus follows a moved row, goes to the next or previous row after Remove (else Add row), and a new row's picture count takes focus.
- **Editor grid**: square thumbnails with one button in each corner (Replace picture top left, Remove top right, Move earlier bottom left, Move later bottom right), because four buttons in a row don't fit a 136px thumbnail on a 320px phone. It doesn't use `FeatureGrid`. A feature without a title is named "feature {n}" in its buttons ("Edit title of feature 1").
- **+ tile**: one native button. Several pictures add several features up to 9; a toast says when some didn't fit ("Only {n} more features fit, so the rest weren't added.", or "Add up to 9 features"). Without Cloudinary keys (local, e2e) a click or a drop opens "Add feature" with "Image reference"; a dropped file never opens in the tab. Focus goes to the new card's title pencil only when it was on the tile as the picture came in, and with several pictures to the first new card.
- `holdUnsaved` and `useHeldWork` are removed; `useUnsavedChanges` still guards unsaved edits.
- **Drag to reorder** (`features-sortable.tsx`): a mouse drags after moving 8px (`MouseSensor`), a finger after a 250ms press and hold (`TouchSensor`, 5px tolerance); not `PointerSensor`, which also takes touch and would start before the hold. Presses on the picture's buttons never drag. The card itself moves (no overlay), lifted with `shadow-md` at 90% opacity; the grip sits at the top centre between the buttons. A single feature doesn't drag and has no grip, like its disabled arrows. Focus stays where the pointer left it. dnd-kit's own announcements (assertive) are off; the editor's polite line names the card as it was before the drop ("Moved feature 2 to position 1 of 2"). The picture has `callout-none` (a `globals.css` utility for `-webkit-touch-callout: none`), so iPhone's Save image menu doesn't open during the hold.

Recommendations

- The carousel shows whole cards: each card carries its gap as right padding, and the row's `-mr-4` puts the last card's padding in the page gutter.
- Previous/Next scroll by one card's width (gap included); the snap tidies any rounding. Before a button is disabled or hidden, focus moves to the other one, or to the row when every card fits.
- The shop page reads `listRecommendations(product)` inside `<Suspense fallback={null}>`, so the product never waits for it. It is the only Suspense boundary like this in the app pages. Preview and the editor call `listRecommendationsAction`; nothing shows while loading, when empty, or when the read fails.
- In the editor each row has its own helper line under the heading, and there is no page-width wrapper (the admin frame has its gutters).

Size guides

- The form value is one flat shape (`SizeGuideFormValues`) whose `chart` is always a table, so the table typed before switching to Accessories survives until Save. The parsed value (`SizeGuideInput`) is a union on `kind`, with `chart` null for Accessories. A picture reference of only spaces counts as none.
- Each type keeps its own picture while the other is picked (Clothing's how-to-measure picture, Accessories' size chart). An upload that finishes after a switch lands on the type it was started for.
- The grid's buttons read "Add size" and "Add measurement" (with a + icon), under the grid next to "{n} of 20 sizes · {n} of 6 measurements". Shift+Enter moves up a column. The row being typed in is tinted.
- **Paste rules**: a copied block is a whole table only when its first cell is exactly "Size" or "Sizes" (a bracketed note is allowed: "SIZE (EU)"), or it is empty with names across the top, and the block has at least one size. A whole table replaces the table, so no template sizes are left over; when something is typed, it asks first ("Replace the table with the one you pasted?", "Keep my table" focused). A heading row on its own fills in the measurement names. A size that starts with the word ("Size 4") is an ordinary row. Empty rows at the end and empty columns on the right are dropped. Anything else fills in from the box it was pasted into.
- **Templates panel**: decided once, when the table first shows. It stays while typing, so the grid doesn't move, and goes when a template is picked or after a Save attempt. Once something is typed, picking a template asks before replacing, with the same dialog as the paste.
- **Popup**: "How to measure" goes side by side when the popup itself is at least 36rem wide (a container query, `@container` / `@xl`), not from the screen's `md`, so the narrow preview beside the form stacks while the real popup doesn't. The intro stays above the picture for Accessories too.
- **Accessories picture**: its box takes the closest of nine shapes (2:1 to 9:16) to the picture's own once it has loaded (`closestShape` in `picture-shape.ts`); square until then.
- **cm | in** is one joined pill switch, the new `RadioGroup variant="segmented"` (+ story; `ui-discipline.md`: a new look is a primitive variant, not overrides), still a radio group labelled "Units". Each half is 44px tall below `lg`, 36px from `lg`.
- "What customers see" defers the typed values and draws the popup again only when they change, in the background. Its wrapper has `min-w-0`, so a wide table scrolls inside it instead of widening the page on phones. Its cm/in choice isn't remembered.
- "What customers see" sits beside the form only from `xl`, sticky and scrolling inside itself. At `lg` and below it goes under the form, so the size table has room for its measurements.
- The product editor's picker shows each guide with its type: "T-shirts (Clothing)".

Also changed on this branch (owner, 2026-09-30)

- Edit pencils, the feature buttons and the rows' buttons are always visible on every screen, not only on hover (`EDITABLE_GROUP` and `reveal` are gone).
- The admin nav stays in place from `lg` while the page scrolls.
- Size boxes widen for long size names (`sizeGridColumns`: 5 per row up to 4 characters, 4 up to 6, 3 up to 9, 2 up to 14, then 1), in the shop's size picker and the editor's size grid; a name that still doesn't fit wraps.
- A file dropped on the editor's main photo never opens in the tab; without uploads it opens the "Image reference" popup.

Tests

- E2E written (the builders did not run them): "product page shows both carousels" (storefront); in the admin flow, an Accessories guide (Type, the required picture, the preview shows it with "Open full size" and no units switch, the list shows the type) and a Custom row plus a picture-only feature through the + tile (its title then shows in Preview and the shop).
- Not covered by e2e: the feature's layout in the shop, and picking an Accessories guide on a product and opening its popup in the shop.
