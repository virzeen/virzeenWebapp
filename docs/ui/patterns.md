# UI Patterns

Standard layouts and behaviors. Build new screens from these instead of inventing new ones. Canonical code lives in `docs/examples/`.

## 1. Page anatomy (every page)

1. `generateMetadata` (title, description, canonical, Open Graph) — see `performance-seo.md`. For a missing item it calls `notFound()` too (share the loader with the page through React `cache()`), so the tab gets the 404 title instead of the page's usual one.
2. Server Component fetches data via `server/queries`.
3. `notFound()` for missing resources, never an empty page. The 404 shows inside the shell: `(site)/[...missing]` sends every unmatched storefront URL to `(site)/not-found.tsx` (header and footer stay), `admin/(panel)/[...missing]` does the same inside the admin frame, and a missing order stays inside the account pages (`account/orders/[orderNumber]/not-found.tsx`). Whole-page 404, error and offline screens use `EmptyState titleAs="h1"`.
4. Sibling `loading.tsx` with a skeleton that matches the layout. A `loading.tsx` covers every page below it, so put it on the route whose layout it matches, not on a route group: `/shop` (also `/shop/[category]`) and `/collections/[slug]` use `ShopListingSkeleton`; `/cart`, `/checkout` (also `/checkout/success`), `/product/[slug]`, `/favourites`, `/portfolio`, `/portfolio/[slug]` and `/account` each have their own.
5. Sibling `error.tsx` (client) with a friendly message and "Try again", which calls Next's `retry()` (it fetches the page again; `reset` would re-render the same failure).
6. Layout built from `Container` + `Stack`/`Grid`.
   Example: `docs/examples/page-product.tsx`.

## 2. Server/client split

- The page and most components are Server Components.
- Only leaves that need state/events are client components (`AddToBagButton`, `QuantityStepper`, `CartDrawer`, forms).
- Pass plain serializable props (ids, strings, numbers) into client components, never Prisma objects or functions from the server.
  Example: `docs/examples/client-add-to-bag.tsx`.

## 3. Mutations (add to bag, update quantity, place order)

1. Client leaf calls a Server Action inside `startTransition` (or a `<form action>`).
2. Show pending immediately (`Button loading`, disabled).
3. On `{ ok: true }` → toast/redirect and let `revalidatePath/Tag` refresh data. Add to bag opens the drawer instead of a toast; remove offers an inline Undo (§7).
4. On `{ ok: false }` → map `error.code` to copy from `content-style.md` and show it (toast or inline).
5. Never update the UI as if it succeeded before the action returns, except simple optimistic quantity changes via `useOptimistic` with rollback.

## 4. Forms

- React Hook Form + `zodResolver(schema)` using the schema from `@virzeen/validators` (the same one the server uses).
- Every input inside `FormField` (label, control, helper, error). Labels always visible — no placeholder-only inputs.
- Validate on blur, re-validate on change after the first error. Submit button shows `loading`.
- Server errors: field-specific → `setError(field)`; general, or a field the form doesn't have → `Alert` at top (`INTERNAL` copy).
- **After a failed submit, the first error is scrolled into view and focused, in screen order.** react-hook-form focuses in registration order (a `Controller` Select comes last), so set `shouldFocusError: false` and focus from an effect on `submitCount`, after the render that shows the messages (`AddressForm`). Long admin forms use `useRevealFirstError(submitCount)` from `client/features/admin/form-focus.ts`: it looks for `[aria-invalid=true]`, then list-level messages (`<p tabIndex={-1} data-field-error>`), then the form `Alert` (`tabIndex={-1} data-error-summary`). Checkout does the same for its `Alert`.
- `Select` inside a `Controller`: pass `field.ref` and `field.onBlur`, so it can take focus and is validated when left.
- Buttons under validate-on-blur fields (Save, Add variant, Add image) use `keepFocusOnPress` on mouse-down. Otherwise the blur error moves the button and the click is lost.
- A disabled submit says why next to it (checkout's hint under Place order).
- Length limits come from the schema. Don't add `maxLength` where people paste formatted values (the phone schema accepts spaces, hyphens and +977).
- Correct `type`, `inputMode`, and `autoComplete` on every input (e.g. `tel` + `inputMode="numeric"` for phone, `autoComplete="shipping street-address"`).
  Example: `docs/examples/form-address.tsx`.

## 5. Lists and grids

- Product grid: 2/3/4 columns, image aspect `4/5`, name, `Price`, optional `Badge`. Whole card is one `Link`.
- Empty result → `EmptyState` with an action. Loading → skeleton cards equal to the page size.
- Pagination: "Load more" button (cursor) on shop pages; numbered pages in admin tables. After "Load more", focus moves to the first new card, and the count reads "{n}+ products" until everything is loaded.
- Shop filters (bottom `Sheet`): each radio group starts with "Any" (a radio can't be unticked); "Clear all" removes every filter and closes the sheet.
- Admin search and filters live in the URL, and their controls follow it: "Clear search", or a link to the plain list, empties them.
- Favourites (`/favourites`, `FavouritesList`, `specs/favourites.md`): the product grid with `role="list"`. Each `FavouriteCard` is one link to `/product/{slug}?style={style}` (the saved style's photo, name, price, style name) with a "Remove" text button under it, since a button can't sit inside a link. Remove hides the card at once (if the save fails it comes back with a toast); focus moves to the next card's Remove, else the previous one's, else the h1 (`tabIndex={-1}`), and a hidden status line says "Removed {name}, {style}.". Signed in, the list renders on the server; a favourite saved since on another device shows at once, and the layout is fetched again once so the header and Favourite buttons know it too. A guest's list lives in the browser, so `GuestFavourites` looks the cards up on the client: skeleton cards (one per saved item, up to 8) while loading, an `Alert` with "Try again" if it fails (Try again moves focus to the h1 while it reloads), and keys whose product is no longer on sale leave the browser's list. Right after sign-in the skeleton stays while the browser's favourites move to the account.

## 6. Product page

Nike-style (`specs/product-page.md`). `ProductDetails` is shared by the shop page and the admin Preview, so it has no server-only imports.

- **Layout.** From `lg`: a grid `lg:grid-cols-[3fr_2fr]` with two rows. The gallery sits on the left across both rows, sticky under the header (`lg:sticky lg:top-24`). The right column is at most 28rem (`max-w-md`): row 1 holds the h1, the category and the price; row 2 the style tiles, sizes, stock label, Add to bag, Favourite, the VAT/shipping/cash note, the description with its bullets and "View product details", then the accordions. Below `lg` the grid stacks: name and price, the gallery edge to edge, then the rest. One h1, placed by the grid (never a copy). Full width underneath: "Features that perform", then "You may also like" (`RelatedProducts`, in Preview too).
- **Selection.** `ProductSelectionProvider` holds the picked style and size; `useProductSelection()` gives the variant and the price to the client leaves that follow them (price, gallery, tiles, sizes, the "Colour shown" / "Style" bullets, the details popup, Favourite). Everything between them stays server-rendered. The page reads `?style=`: `styleFromParam` picks it when the product sells that style with stock, else the first style with stock. Picking a style writes `?style=` with `history.replaceState` (no reload, no history entry; the canonical stays `/product/{slug}`), except in Preview. On the shop page the pick starts from the address, so after Back it follows the `?style=` shown. A picked size carries over when the new style has it in stock. In Preview, a picked style or size the editor renames or removes falls back to the default.
- **Gallery** (`StyleGallery` → `ProductGallery`, keyed by style so it restarts at the first photo). `galleryFor` gives only the picked style's photos; a style without its own shows the shared photos, then the first style's that has some; a product without style photos shows them all. From `lg`: a strip of 4rem thumbnails (hover or click shows one, the shown one has `aria-current`, the strip scrolls) beside one 4:5 photo no taller than the screen (`max-w-gallery-photo`), with round bordered Previous/Next buttons that wrap around. Below `lg`: `GalleryCarousel`, a focusable scroll-snap row with dots hidden from screen readers (cut off at the edges, never a sideways page scroll); when it shows or changes width it scrolls to the photo picked meanwhile. A live region says "Photo {n} of {total}". One photo: just the photo, capped at the screen height like the main photo.
- **Style tiles and sizes.** With style photos, `StylePicker` is a `RadioGroup swatch` of 64px square tiles (each style's first photo, else the main photo) labelled "Style: {name}"; otherwise `card` chips labelled "Colour: {name}". A style with nothing in stock is disabled (a diagonal line on the tile). `SizePicker` is a `FormField` "Select size" with "Size guide" in `labelAside`, then `card` boxes, at most 5 in a row; sold-out sizes stay visible, struck through and disabled.
- **Add to bag.** Before a size is chosen the button reads "Select a size" and stays enabled: pressing it scrolls to the sizes, focuses the first one and shows "Select a size" under them. It is disabled only when sold out. When the bag already holds every piece left (or 10), pressing it says so under the button instead of calling the server. A successful add opens the bag drawer (no toast), and closing the drawer returns focus to the button. On phones it sits in a sticky bottom bar with the price (`data-sticky-cta`).
- **Favourite** sits under Add to bag, outside the sticky bar. It saves the picked style (the first style when all are sold out); in Preview it only shows a toast.
- **Popups** use `Dialog size="lg"`; Escape, the X and a click outside close them, and focus returns to the button. "View product details" (`Button variant="underline"`): the picked style's photo in `media`, the price as the description; description, Benefits, Product details, Care. "Size guide": the guide's name as the description; the cm/in choice (`RadioGroup card`) is remembered for the visit in sessionStorage; the chart scrolls sideways inside a focusable `role="region"` named by its caption, with `th scope` on sizes and measurements.
- **Accordions** (`ProductAccordions`, `headingLevel={2}`): "Delivery and returns"; "Size and fit" only with a size guide.
- **Features row** (`ProductFeatures`): 1 card per view with the next one peeking on phones, 2 from `md`, 3 from `lg`. Previous/Next buttons from `md`, disabled at the ends (focus moves to the other one first) and hidden when every card fits; the row is measured again when cards come or go. The row is focusable (arrow keys scroll it), and "Skip features" jumps past it.

## 7. Cart drawer

Opens after add-to-bag (description "Added to bag · N items") and from the header. Lines (`CartLine`): image, name, variant, "{Rs X} each" when there are several, `QuantityStepper`, line `Price`, Remove, and a note when "+" stops ("Only N left", "Limit 10 of each", "Out of stock"). Footer: subtotal, "Free shipping across Nepal. Prices include VAT.", primary "Checkout", secondary "View bag". The drawer has no trigger of its own, so `open({ returnFocusTo })` records what opened it (header bag or Add to bag) and focus goes back there on close.

**Remove with inline undo** (drawer and `/cart`). Never a toast: behind the modal drawer a toast's Undo can't be reached.

1. Remove → the line goes and `RemovedLineNotice` shows "Removed {name}." with Undo: at the top of the drawer's list (in a `role="status"` region), or on `/cart` exactly where the line was.
2. Keyboard focus moves to Undo, since the pressed Remove button is gone.
3. Undo puts the line back in its old place (it keeps its original added time) and focuses its product link. If Undo fails, the row shows the error instead of "Removed {name}.".
4. Closing the drawer, or another change to the bag, ends the offer.

After −, + or Remove, focus returns to the pressed button, or to the other stepper button when a limit disabled it.

## 8. Checkout

Single page, three clear sections (Address → Delivery summary → Payment). From `lg` the order summary sits on the right. Below `lg` a collapsed "Order summary · {total}" (an `AccordionItem` with `headingLevel={2}`) opens the page, and the card by the button holds only the totals, headed "Order total". One primary button at the end. See `docs/specs/checkout.md`.

- When only one payment method is offered (cash on delivery at launch), it is already chosen.
- "Place order" is disabled until an address and a method are chosen, with the reason under it.
- A form error shows at the top of the form from `lg` and just above "Place order" below `lg`, then scrolls into view and takes focus.
- Address section focus: "Add a new address" → the section heading; Cancel → "Add a new address"; after saving → the new address.

## 9. Portfolio pages

Full-bleed hero image (priority load), large display headline, generous whitespace, alternating image/text sections, products from the lookbook linked at the end. Motion: subtle fade/translate on scroll, disabled for reduced motion. The index and each story have their own skeleton; the index boundary also covers stories, so it shows the story skeleton on the way to one.

## 10. Admin

Function over form: `DataTable` with search, filters, status `Badge`s; forms in pages (not dialogs) for create/edit; every destructive action confirmed with `Dialog`; every successful mutation shows a toast.

**Frame** (`admin/(panel)/layout.tsx`): skip link, header, `AdminNav` and `<main id="main">`. The header holds the wordmark with "Admin" (stacked under it below `sm`), then the admin's email (from `sm`), "View shop" and "Sign out" (`SignOutButton`, a text button so the row fits a 320px phone). The nav wraps onto extra rows on phones and tablets (every section stays in view, no sideways scroll) and becomes a column from `lg`. Shared boundaries cover every admin page, so the nav stays usable:

- `loading.tsx`: a title row and a 6-row table skeleton.
- `error.tsx`: an h1 "Something went wrong on our side.", then a danger `Alert` with "Try again" (`retry()`).
- `not-found.tsx`: missing items and mistyped `/admin` addresses (`[...missing]`), with "Back to dashboard". Non-admins get the root 404 instead.

**Settings** (`/admin/settings`, the last nav item): three sections, each a `<section aria-labelledby>` with an h2. "Your account" is the same `ProfileForm` as `/account/settings`. "Sign-in security" only reads: the authenticator status, when the next code is asked for (`getAdminVerifiedUntil()`), and how a lost phone is handled. It has no reset, disable or new-QR buttons, because admin rights and authenticator resets happen only with `pnpm admin` (security-policy.md §2). "Sign out" ends this device's session.

**Product editor** (`ProductEditor`, `specs/product-editor-on-page.md`, `/admin/products/[id]`): the product page as customers see it (the same grid, order and pieces as `ProductDetails`, §6) with everything edited in place, and a `loading.tsx` skeleton of the same layout. `ProductEditorProvider` owns the one react-hook-form form over `ProductInput` and its only `images` and `variants` field arrays; style state and handlers live in `useVariantOptions`.

- **Top bar** (`EditorTopBar`, sticky, `data-editor-bar`: `globals.css` gives the page `scroll-padding-top` so focused fields stop below it; two rows below `md`, one from `md`): "← Products", the status chip (Draft/Published, a `Popover` with the live "Before publishing" checklist), the save state, Preview, Settings (a `Sheet`: URL slug and search description, collections, "Different prices for some sizes", "Edit SKU codes" with a SKU box per row, View in shop, Duplicate, Archive) and Publish/Unpublish. Publish opens the checklist when something is missing; otherwise it saves with `isPublished` on, which checks the whole product first.
- **Autosave** (`useAutosave`, `autosave-queue.ts`, `autosave-run.ts`): every finished edit calls `commit()`, or `commitField`/`commitFields`, which check the change against `productSchema` first and return the message to show under the field. One save runs at a time; edits during it queue exactly one more, which reads the latest values. Before sending, the whole product is checked: problems go on their fields and the bar says "Fix the highlighted field to save" with Show (focuses the first). A save with no changes sends nothing. The answer is merged back (`merge-saved.ts`): with no edits meanwhile the form becomes the saved values; otherwise only what the server made (variant ids, SKUs, style numbers, photo and feature descriptions, the slug) is patched in path by path, so field arrays keep their keys and focus, then it saves again. A failed request shows "Couldn't save: {reason}" with Try again. The slug follows the name until the product is first published or the slug is typed; a clash on a made slug retries with -2, -3. Leaving the page asks (`useUnsavedChanges`) unless everything is saved; work kept outside the form (a new feature card) joins that one check through `holdUnsaved`.
- **Edit in place** (`EditableText`, `EditableSelect`, `EditPencil`, `EditableView`): the content shows as on the shop page with a round pencil beside it ("Edit {field}"). Inside an `EDITABLE_GROUP` the pencil appears on hover or focus from `md` with a mouse, always on touch, and stays in the tab order. Pressing the pencil, or double-clicking the content (a mouse shortcut), opens a box with the text selected and a hint. Enter (one line), Ctrl/Cmd+Enter (long text) or clicking/tabbing outside saves; Escape cancels and restores; focus goes back to the pencil. A problem keeps the box open with the message under it. `EditableSelect` saves on picking. Inside a `Dialog`, `Sheet` or `Popover`, Radix hears Escape before React's handlers, so cancel the edit from the dialog's `onEscapeKeyDown` (`ai/common-mistakes.md`).
- **New product** (`NewProductDialog` on the products list): name, category and price → "Create draft" (`createDraftProductAction`), then the editor opens on the draft. It is a form in a dialog, an exception to "forms in pages" because it holds only three fields; `/admin/products/new` shows the same form as a page. Small dialogs also hold "Add a style", "Edit style" and, without Cloudinary keys, "Add photos".
- **Gallery** (`EditorGallery`, `media-*`): the shop's gallery for the picked style. "Add photos" sits on the main photo (files can be dropped on it) and a + tile ends the strip; with no photos the main area is a 4:5 drop zone. Make main, move earlier/later and Remove (asks first) sit on the main photo and act on the photo shown there (under the photo on phones), since a 4rem thumbnail can't hold 44px buttons. A style without its own photos shows the shared ones with a note, or the drop zone. A finished upload lands on the style it was started for, at the end, and follows a rename made meanwhile; it is dropped if the style was removed (`media-landing.ts`).
- **Styles and sizes**: style tiles (or colour chips) end with a + tile ("Add a style"). The pencil beside "Style: {name}", or double-clicking a tile, opens "Edit style": name, colour shown, the style number (read-only) and Remove style (asks first). The sizes have a pencil for the size chips, and under each size a stock box for the picked style ("Stock, Black, M"), plus a price box when prices differ per size; a switched-off row reads "Not for sale". Boxes save when left. Add to bag and Favourite show, disabled, with "Customers use these buttons."
- **Description and details**: the description, the bullets (Colour shown for the picked style, the style number read-only, origin), and "View product details", which opens the shop's popup built from the current values. Under it, a box with Product details and Benefits (one per line; a problem names the line) and Care. "Size and fit" is always shown and open in the editor, with the size guide picker and "Manage size guides".
- **Features that perform**: the cards wrap into rows (1, 2 or 3 columns) so each can be edited. A + card starts a new feature with its picture; until it has a picture, a title and text it stays out of the form ("Not saved yet"), so autosave never sends half a feature, and only one new card exists at a time. Uploads find their card by its key. Each card has Move earlier/later, Remove (asks first), Replace picture and a picture description line.
- **Made descriptions**: photo and feature picture descriptions the save made are shown as blank and cleared ("") when the product is renamed, a photo moved or removed, a style renamed or a feature title changed, so the next save makes them again (`made-alts.ts`, `features-cards.ts`).
- **You may also like** (`EditorRelated`): `listRelatedByCategoryAction` with the shop's cards; the links open in a new tab, which the leave check skips.

**Preview** (`/preview/product?key=<id>`, admins only, noindex): `useEditorPreview` writes the editor's values to localStorage (`preview-draft.ts`) when Preview opens and 250ms after each change, through one `form.subscribe` for the editor's life that reads the latest hand-over through a ref (`ai/common-mistakes.md`). The preview tab reads them with `useSyncExternalStore` + the `storage` event and renders `ProductDetails`, the same component as the shop's product page, with `preview` (Add to bag and Favourite only show a toast). The shop's fixed bottom bar (`data-sticky-cta`) gets `scroll-padding-bottom` and lifts bottom toasts above it in `globals.css`.

**Size guides** (`/admin/size-guides`, `specs/size-guides.md`): a `DataTable` list plus forms in pages (`SizeGuideForm` for new and edit; after the first save it moves to the edit page). The chart is a controlled grid run by `useSizeChart`: the chart lives in the form as `chart`, and the hook keeps a key per measurement and size so moving one moves its inputs. Measurements are a list (1–6); sizes are a table whose column headers are the visible labels, so each input's name repeats them with the row ("Chest (cm), M"). Moving or removing one refocuses like other admin lists. Server field errors arrive as `guide.*` and are set without the prefix. `useRevealFirstError` and `useUnsavedChanges` work as in the other admin forms.

**Order tables on phones**: the Order cell holds the number link (`font-mono whitespace-nowrap`, `after:absolute after:inset-0` so the whole cell is the tap target), the date under it, and a `md:hidden` status badge. The Status and Payment columns use `hideOnMobile` and Customer uses `hideBelow="xl"`, so Total stays on screen.

**Errors and focus**: errors the admin must act on stay in the dialog (archive blocked: the reason in an `Alert` and a single OK) or under the field (order-action dialogs validate with the same schema as the server). After an order action, focus goes to the first action now on offer, or to the "Order actions" group when none is left. Moving or removing a list item (story block, image, variant) refocuses the same control in its new place with `refocusAfterListChange`.
