# Content Style (UI copy)

Consistent words make the brand feel premium and reduce support questions. Use these exact strings. New common strings are added here first.

## Voice

Calm, warm, confident. Short sentences. Sentence case. No exclamation marks in errors, no blame ("You entered an invalid…" → "Enter a 10-digit mobile number").

Errors say what to do next: "Choose your district", "Keep the name under 120 characters", "Tick For sale on at least one variant, or switch off Published". A disabled control says why nearby ("Choose a delivery address to continue.", "Limit 10 of each").

## Standard actions

| Action                                | Text                                   |
| ------------------------------------- | -------------------------------------- |
| Add product to cart                   | Add to bag                             |
| Open cart                             | Bag (icon label: "Open bag")           |
| Go to checkout                        | Checkout                               |
| Submit order                          | Place order                            |
| Online payment                        | Continue to eSewa / Continue to Khalti |
| Retry                                 | Try again                              |
| Save form                             | Save                                   |
| Remove line                           | Remove                                 |
| Undo                                  | Undo                                   |
| Sign in                               | Sign in (not "Log in")                 |
| Sign out                              | Sign out (not "Log out")               |
| Leave a 404 or an empty bag           | Browse the collection                  |
| Leave an error or the offline page    | Go to the home page                    |
| Close a dialog with nothing to decide | OK                                     |

## Standard messages

| Situation                                                           | Message                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Added to bag (the bag drawer opens and says so; no toast)           | Added to bag · {n} item / Added to bag · {n} items                                               |
| Removed a bag line (inline row where the line was; no toast)        | Removed {productName}. — [Undo]                                                                  |
| Empty bag                                                           | Your bag is empty. — [Browse the collection]                                                     |
| No orders                                                           | You haven't placed any orders yet. — [Start shopping]                                            |
| No search results                                                   | Nothing matches "{query}". Try a different word or browse all products. — [Show all products]    |
| Out of stock                                                        | Out of stock                                                                                     |
| Low stock                                                           | Only {n} left                                                                                    |
| `OUT_OF_STOCK` at checkout                                          | Some items just sold out. We've updated your bag.                                                |
| `PRICE_CHANGED`                                                     | A price changed since you added this item. Please review your bag.                               |
| `PAYMENT_FAILED`                                                    | Payment didn't go through. Your bag is saved — try again or choose another method.               |
| `PAYMENT_PENDING`                                                   | We're confirming your payment. This usually takes a minute — you'll get an email when it's done. |
| `RATE_LIMITED`                                                      | Too many attempts. Please wait a few minutes and try again.                                      |
| `DELIVERY_FAILED`                                                   | We couldn't send your code. Please try again in a few minutes.                                   |
| `INTERNAL` / unknown (also a form error with no field to sit under) | Something went wrong on our side. Please try again.                                              |
| Order confirmed                                                     | Thank you — your order {orderNumber} is confirmed.                                               |

## Field errors

Inputs say "Enter", choices (Select, radios) say "Choose".

| Field                          | Error                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Required                       | Enter your {field}                                                                                               |
| Required choice (Select)       | Choose your {field} (e.g. Choose your province, Choose your district)                                            |
| Too long                       | Keep your {field} under {n} characters (admin fields: Keep the {field} under {n} characters)                     |
| Phone                          | Enter a 10-digit mobile number starting with 97 or 98 (spaces, brackets, hyphens and a +977 prefix are accepted) |
| District not in the province   | Choose a district in this province                                                                               |
| Email                          | Enter a valid email address                                                                                      |
| OTP                            | Enter the 6-digit code we sent to your email                                                                     |
| Size not chosen (product page) | Select a size                                                                                                    |

## Bag and product page

| Situation                                                       | Text                                                |
| --------------------------------------------------------------- | --------------------------------------------------- |
| Add to bag before a size is chosen (pressing it points to Size) | Select a size                                       |
| Add to bag when the variant is sold out                         | Out of stock                                        |
| Under Add to bag: the bag already holds the last piece          | The last one is already in your bag.                |
| Under Add to bag: the bag already holds every piece left        | All {n} left are already in your bag.               |
| Under Add to bag: the bag already holds the per-line cap        | Limit 10 of each — you already have 10 in your bag. |
| Bag line, quantity over 1 (under the variant)                   | {Rs X} each                                         |
| Bag line, "+" stopped by stock                                  | Only {n} left                                       |
| Bag line, "+" stopped by the per-line cap                       | Limit 10 of each                                    |
| Bag line, variant sold out since it was added                   | Out of stock                                        |
| Bag line, product no longer sold                                | No longer available                                 |
| Bag drawer description (otherwise)                              | {n} item / {n} items                                |
| Bag drawer footer                                               | Free shipping across Nepal. Prices include VAT.     |
| Undo failed (replaces "Removed {productName}.")                 | The error's standard message (above)                |

## Shop listing

| Situation                                 | Text                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Result count                              | 1 product · {n} products · {n}+ products (while Load more has more) · No products                    |
| Filters sheet, first Size / Colour option | Any (the default; removes that filter)                                                               |
| Filters sheet buttons                     | Clear all (removes every filter and closes the sheet) · Show results                                 |
| Nothing matches the filters               | Nothing matches these filters. Try removing a filter or browse all products. — [Browse all products] |
| No products at all                        | New pieces are on their way. Check back soon — or explore our portfolio. — [View the portfolio]      |
| Gallery list name (screen readers)        | {productName} images                                                                                 |

## Checkout

| Situation                                                      | Text                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Delivery section before an address is chosen                   | Choose an address to see the delivery time.                               |
| Delivery section with an address                               | Arrives in {estimate}.                                                    |
| Shipping line before an address is chosen                      | — (unless shipping is free)                                               |
| Under Place order: no saved address (the address form is open) | Add a delivery address to continue.                                       |
| Under Place order: adding a new address while others are saved | Save the new address to continue.                                         |
| Under Place order: saved addresses, none chosen                | Choose a delivery address to continue.                                    |
| Under Place order: 2+ payment methods, none chosen             | Choose a payment method to continue.                                      |
| The chosen address was deleted elsewhere (`NOT_FOUND`)         | That address is no longer saved. Choose another address or add a new one. |
| Cash on delivery option                                        | Cash on delivery — Pay the courier when your order arrives                |
| Cash on delivery over its limit                                | Cash on delivery is available for orders up to {Rs X}.                    |
| Collapsed summary at the top (below `lg`)                      | Order summary · {total}                                                   |
| Summary card heading                                           | Order summary (from `lg`) · Order total (below `lg`)                      |
| Confirmation page tab title                                    | Order confirmed · Order cancelled · Confirming your payment               |

## Addresses (account and checkout)

The first address is the default. The default can't be switched off, only moved: saving another address with "Make this my default address" moves it. Removing the default makes the oldest remaining address the default.

| Situation                                                    | Text                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Default checkbox (a new address, or one that isn't default)  | Make this my default address                                                    |
| Editing the current default (replaces the checkbox)          | This is your default address                                                    |
| Mobile number helper                                         | The courier will call this number                                               |
| Landmark helper                                              | Optional — helps the courier find you                                           |
| District before a province is chosen (placeholder, no error) | Choose a province first                                                         |
| Landmark line (address card, order details)                  | Landmark: {landmark}                                                            |
| Edit / Remove buttons (screen readers)                       | Edit address for {fullName}, {street} · Remove address for {fullName}, {street} |
| Remove dialog                                                | Remove this address? — {street}, {city} — [Keep] [Remove]                       |
| Saved / removed (toasts)                                     | Address saved · Address removed                                                 |
| Address book full (`CONFLICT`)                               | You can save up to 10 addresses. Remove one to add another.                     |
| No addresses                                                 | No saved addresses yet. — [Add an address]                                      |

## Order and payment status

The words on badges, in the order timeline and in the admin history (`client/lib/order-labels.ts`).

| Status                                                             | Label                                               |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| Order `PENDING` · `CONFIRMED` · `PROCESSING`                       | Awaiting payment · Confirmed · Being packed         |
| Order `SHIPPED` · `DELIVERED` · `CANCELLED` · `RETURNED`           | Shipped · Delivered · Cancelled · Returned          |
| First timeline event                                               | Order placed                                        |
| Payment `UNPAID` · `PENDING` · `PAID`                              | Unpaid · Confirming payment · Paid                  |
| Payment `FAILED` · `EXPIRED`                                       | Payment failed · Payment expired                    |
| Payment `REFUNDED` · `PARTIALLY_REFUNDED`                          | Refunded · Partly refunded                          |
| Payment `COD_DUE` · `COD_COLLECTED`                                | Pay on delivery · Paid on delivery                  |
| Cash-on-delivery order cancelled or refused at the door (`FAILED`) | Not charged (neutral badge, never "Payment failed") |
| Payment method                                                     | Cash on delivery · eSewa · Khalti                   |

## Not found, errors and offline

| Situation                              | Text                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Page not found (h1; any unmatched URL) | We couldn't find that page. It may have moved, or the link might be wrong. — [Browse the collection]                                       |
| Page not found, tab title              | Page not found                                                                                                                             |
| Order not in this account              | We couldn't find that order in your account. If you ordered with a different email, sign in with that one. — [All orders]                  |
| Something failed (h1)                  | Something went wrong on our side. Please try again. If it keeps happening, come back in a few minutes. — [Try again] [Go to the home page] |
| Offline (h1)                           | You're offline. Check your connection and try again. Your bag is saved. — [Try again] [Go to the home page]                                |
| Portfolio with no stories              | Our first stories are coming soon.                                                                                                         |

## Contact and social

| Where                                      | Text                                                               |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `/contact`, under "Instagram"              | See new pieces and preorders first on Instagram: @virzeen.co.      |
| Footer, Virzeen column                     | Instagram (links to instagram.com/virzeen.co)                      |
| Footer, bottom row (each fact on one line) | Cash on delivery · Free shipping across Nepal · 7-day free returns |
| Footer, legal line                         | © {year} Virzeen. Prices include 13% VAT.                          |

## Sign-in code (`/verify`)

The code is checked as soon as the sixth digit is in, so the field's helper text says so; it is read out when the field takes focus (specs/sign-in-code.md).

| Situation                                  | Text                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| Intro under "Check your email"             | We sent a 6-digit code to {email}. It expires in 10 minutes. |
| Helper under the boxes                     | We'll sign you in as soon as all 6 digits are in.            |
| Checking (status line under the boxes)     | Checking your code…                                          |
| Accepted (status line)                     | Code accepted. Signing you in…                               |
| Wrong code (`INVALID_OTP`)                 | That code isn't right. Check it and try again.               |
| Expired code (`OTP_EXPIRED`)               | That code has expired. Send a new one.                       |
| Too many wrong codes (`TOO_MANY_ATTEMPTS`) | Too many wrong codes. Send a new code to try again.          |
| Resend link                                | Send a new code · while it waits: Send a new code in {n}s    |
| New code sent (toast)                      | We sent a new code                                           |

Too many requests and anything unexpected use the standard `RATE_LIMITED` and `INTERNAL` messages, in an `Alert` with "Try again".

## Admin

### Frame, lists and dialogs

| Situation                                      | Text                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Admin page failed (h1, then a danger `Alert`)  | Something went wrong on our side. — Please try again. If it keeps happening, come back in a few minutes. [Try again]                                                                 |
| Authenticator step (`/admin/verify`)           | Signed in as {email} (under the heading) · [Use a different email] under the form: signs out, back to Sign in                                                                        |
| Header (right side)                            | {email} (from `sm`) · [View shop] · [Sign out] (signs out on this device, then the home page)                                                                                        |
| Sign out failed (any Sign out button; toast)   | `RATE_LIMITED` or `INTERNAL` standard message. The person stays signed in on the same page and can press Sign out again.                                                             |
| Nav                                            | Dashboard · Orders · Products · Categories · Collections · Portfolio · Customers · Settings                                                                                          |
| Missing item or mistyped `/admin` address (h1) | This page doesn't exist, or the item was archived. — [Back to dashboard] (tab title: Not found)                                                                                      |
| Dashboard tiles                                | Orders today · Sales today · To pack · To ship · Payments pending                                                                                                                    |
| Dashboard tile link (visible · screen readers) | View · View orders to pack / View orders to ship / View orders with payment pending                                                                                                  |
| Order history, "Change" column                 | Order placed · {from} → {to} (e.g. Confirmed → Being packed) · Payment: {from} → {to} (e.g. Payment: Unpaid → Pay on delivery)                                                       |
| Order page, actions group (screen readers)     | Order actions                                                                                                                                                                        |
| Customers, no name                             | —                                                                                                                                                                                    |
| Customers, orders link (screen readers)        | {n} order from {email} / {n} orders from {email}                                                                                                                                     |
| Products search                                | Search products (label) · Product name (placeholder) · [Search] · [Clear search]                                                                                                     |
| Products count                                 | 1 product · {n} products · 1 product matches "{q}" · {n} products match "{q}"                                                                                                        |
| Empty lists                                    | No products yet. — [Add your first product] · No orders yet. · No orders match. — [Clear filters] · No customers yet. · No projects yet.                                             |
| Empty categories / collections                 | No categories yet. Add Tops, Bottoms, Accessories… to organise the shop. · No collections yet. Group products for campaigns and seasons.                                             |
| Category and collection forms                  | Add a category · Add a collection · Edit {name} (heading and the Edit button's name) · field "URL slug"                                                                              |
| Archive dialog                                 | Archive {name}? — It disappears from the shop. Past orders keep their details. [Keep] [Archive]                                                                                      |
| Archive blocked (`CONFLICT`, `NOT_FOUND`)      | {name} can't be archived yet — the reason in a danger `Alert` — [OK]                                                                                                                 |
| Category still has products                    | Move or archive the {n} product in this category first. / Move or archive the {n} products in this category first.                                                                   |
| Portfolio kind                                 | Campaign · Lookbook · Collaboration                                                                                                                                                  |
| Saved (toasts)                                 | Product published · Draft saved · Product saved · Product unpublished · Copy saved as a draft · Category added · Project saved · Category saved · Collection saved · {name} archived |

### Product editor (`/admin/products/new`, `/admin/products/{id}`)

| Where                                | Text                                                                                                                                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New product (description)            | Fill in the details, then Publish. Or Save draft and finish later: drafts aren't in the shop.                                                                                                                                                                  |
| Sections                             | Photos · Description and care · Price and stock · sidebar: Publish · Organise · Search engines                                                                                                                                                                 |
| Publish box                          | Draft / Published badge · "Only admins can see this product until you publish it." / "Customers can see this product."                                                                                                                                         |
| Publish box, unsaved                 | (added) You have unsaved changes.                                                                                                                                                                                                                              |
| Checklist ("Before publishing")      | Name · At least one photo · Description · Price · Shipping (0 for none) · Category · Something ticked For sale                                                                                                                                                 |
| Checklist warning (all else done)    | Stock is 0, so it will show as sold out.                                                                                                                                                                                                                       |
| Buttons                              | Draft: [Publish] [Save draft] · Published: [Save] [Unpublish] · [View in shop] · [Duplicate] (list: icon, "Duplicate {name}")                                                                                                                                  |
| Leaving with unsaved changes         | Leave without saving? Your changes will be lost.                                                                                                                                                                                                               |
| Duplicate with unsaved changes       | Duplicate the saved version? Your unsaved changes here will be lost.                                                                                                                                                                                           |
| Photos                               | {n} of 12 · the first is the main photo · Main photo (badge) · [Make main] · Move photo {n} earlier/later · Remove photo {n}                                                                                                                                   |
| Photo drop area                      | Drag photos here, or choose them. JPG, PNG, WebP or AVIF, up to 10 MB each. [Choose photos] · tiles "Uploading {file}"                                                                                                                                         |
| Photo problems                       | {file}: choose a JPG, PNG, WebP or AVIF image. · {file} is over 10 MB. Compress it to about 2500px first. · {file} didn't upload. Please try again.                                                                                                            |
| Too many photos                      | Photos are full (12 at most). Remove one to add another. · Only {n} more photos fit (12 at most), so the rest weren't added.                                                                                                                                   |
| Photo descriptions (accordion)       | Photo descriptions (optional) — Read out by screen readers and used by search engines. Leave blank to use the product name.                                                                                                                                    |
| Price and shipping                   | Price (Rs), helper "Includes VAT" · Shipping (Rs) · Customers pay {Rs X} with free shipping.                                                                                                                                                                   |
| Per-row prices                       | Different prices for some sizes or colours — (ticked) Untick to use the first row's price for all.                                                                                                                                                             |
| Sizes / colours                      | Sizes · Colours — Type one and press Enter, or separate several with commas. · [+ S, M, L, XL] [+ Free size] · Remove size {value}                                                                                                                             |
| Stock grid                           | For sale · Stock · Price (Rs) · SKU · row name "Black, M" ("Standard" with neither) · Saved rows can't be deleted because past orders use them. Untick For sale to stop selling one.                                                                           |
| No sizes or colours                  | Stock — How many you have. Add sizes or colours above to count each one.                                                                                                                                                                                       |
| SKU codes                            | Edit SKU codes — Stock codes are made when you save (VZ-PRODUCT-COLOUR-SIZE). Tick to type your own. · placeholder "Made on save"                                                                                                                              |
| SKU format error                     | Use the format VZ-PRODUCT-COLOUR-SIZE, or leave it blank to make one                                                                                                                                                                                           |
| New category (Organise)              | [+ New category] → New category name · [Add category] [Cancel] · A category with this name already exists. Choose it in the list.                                                                                                                              |
| Search engines                       | URL slug — The end of the address: /product/your-slug. Made from the name. · Search description — Optional, up to 155 characters. Shown under the name in Google.                                                                                              |
| Products list filters                | All ({n}) · Published ({n}) · Drafts ({n}) · badges No photos / Out of stock · empty: No drafts. / Nothing published yet.                                                                                                                                      |
| Styles (editor)                      | Styles — Colours or designs shown on one product page, like Nike's colourways. Each style has its own photos, price and stock; customers switch between them with picture swatches.                                                                            |
| Add a style                          | Add a style (first; helper "A colour or a design, e.g. Black or Mountain print.") / Add another style · placeholder "Style name" · [Add style]                                                                                                                 |
| Style name problems                  | Enter a name for the style · Keep the style name under 40 characters · There's already a style with this name · (a photo) No style is called "{name}"                                                                                                          |
| Style card                           | {name} (h3) · [Rename] → Style name [Save name] [Cancel] · [Remove style] → Dialog "Remove {name}?" — Its photos go too. Saved sizes stay on the list, switched off, because past orders use them. Nothing changes in the shop until you save. [Keep] [Remove] |
| Photos with styles                   | Photos for every style — Optional: photos that fit every style, like a size chart. Each style's own photos are in its card under Price and stock.                                                                                                              |
| Shop, style picker                   | Style: {name} (picture swatches) · Colour: {name} (no style photos) · product card "{n} styles" / "{n} colours"                                                                                                                                                |
| Preview (editor)                     | [Preview] (phones: eye button, name "Preview") — opens a new tab                                                                                                                                                                                               |
| Preview bar                          | Preview: only you can see this. It updates as you edit. · [Phone size] (from md) · [Close preview]                                                                                                                                                             |
| Preview, Add to bag (toast)          | This is a preview. Nothing was added to your bag.                                                                                                                                                                                                              |
| Preview, no draft / nothing for sale | Nothing to preview yet. — Open a product in the admin and press Preview. [Go to products] · Nothing is ticked For sale. — Customers can't open a product page with nothing for sale. Tick For sale on a size or colour in the editor to see it here.           |

### Settings (`/admin/settings`)

The admin's own account. Nothing here changes admin rights or the authenticator: that is `pnpm admin` only (security-policy.md §2).

| Where                                           | Text                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page (h1, description)                          | Settings — Your account and how you sign in.                                                                                                                                                                                                                                                                                                                                                        |
| Section headings (h2)                           | Your account · Sign-in security · Sign out                                                                                                                                                                                                                                                                                                                                                          |
| Your account (same form as `/account/settings`) | Name · Email, helper "You sign in with this email." (read-only) · [Save] · toast "Saved"                                                                                                                                                                                                                                                                                                            |
| Authenticator status                            | Authenticator app [On] (success badge)                                                                                                                                                                                                                                                                                                                                                              |
| When the next code is asked for                 | The admin area asks for a code from your authenticator app each time you sign in, and again every 12 hours. On this device, you'll be asked for the next one after {date, time}. (the date as `28 Sep 2026, 3:45 PM`; the hours come from `ADMIN_VERIFICATION_HOURS`)                                                                                                                               |
| Lost phone (h3, then the note)                  | Lost or replaced your phone? — The authenticator can't be reset or switched off on the website, so nobody can remove it from here. Ask your developer to reset it. They'll call you first to check it's really you. Then sign in again and scan the new QR code with your new phone. — Still have the old phone? Most authenticator apps can move your codes to a new phone, so no reset is needed. |
| Sign out section                                | Signs you out on this device and takes you to the home page. [Sign out]                                                                                                                                                                                                                                                                                                                             |

### Form errors

Shown under the field (or under the list for list rules). After a failed save the first one is scrolled into view and focused.

| Field or rule                        | Error                                                                                                                                                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required                             | Enter the product name · Enter a description · Enter a name · Enter a title · Enter a short summary                                                                                                                                                         |
| URL slug                             | Enter a URL slug · Keep the URL slug under 120 characters · Use lowercase letters, numbers and hyphens                                                                                                                                                      |
| SKU                                  | Enter a SKU · Use the format VZ-PRODUCT-COLOUR-SIZE                                                                                                                                                                                                         |
| SKU repeated in the form (each row)  | Another variant has the same SKU                                                                                                                                                                                                                            |
| SKU taken (on save)                  | Another product already uses this SKU · Another variant of this product uses this SKU                                                                                                                                                                       |
| SKU taken, form `Alert`              | One SKU is already used. Change it and save again. / Some SKUs are already used. Change them and save again.                                                                                                                                                |
| SKU taken, under the variants list   | One of these SKUs is already used. Change it and save again.                                                                                                                                                                                                |
| Category                             | Choose a category                                                                                                                                                                                                                                           |
| Price                                | Enter a price in rupees, e.g. 1250 · Enter a price of at least Rs 1 · Enter a price under Rs 1 crore                                                                                                                                                        |
| Stock                                | Enter the stock as a whole number (0 or more) · Stock can't be negative · Enter a stock of 100,000 or less                                                                                                                                                  |
| Published without a variant for sale | Tick For sale on at least one variant, or switch off Published (form `Alert`: A published product needs at least one variant for sale.)                                                                                                                     |
| Published without an image           | Add at least one image before publishing                                                                                                                                                                                                                    |
| Image reference                      | Add an image · Use a Cloudinary public id or a /public path, not a web address                                                                                                                                                                              |
| Alt text                             | Describe the image for screen readers · Keep the alt text under 200 characters                                                                                                                                                                              |
| Portfolio cover                      | Add a cover image                                                                                                                                                                                                                                           |
| List order (category, portfolio)     | Enter a whole number from 0 to 1,000                                                                                                                                                                                                                        |
| Story text block                     | Write the text for this block · Keep this block under 4,000 characters                                                                                                                                                                                      |
| Max length                           | Keep the {field} under {n} characters: name 120 (product) / 60 (category) / 80 (collection), description 5,000 (product) / 500 (collection), care notes 2,000, search description 155, size 20, colour 40, title 120, summary 300, heading 120, caption 200 |
| List limits                          | Add at least one variant · Add up to 60 variants · Add up to 12 images · Add up to 40 blocks · Choose up to 20 collections · Choose up to 24 products                                                                                                       |
| Order dialogs                        | Enter the courier name · Enter the tracking number · Add a short reason                                                                                                                                                                                     |

## Emails

Frame and rules: backend-policies.md §9. The sign-in code email's heading is the owners' wording (2026-09-29), so it keeps its capitals.

| Where                      | Text                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Code email subject         | {code} is your Virzeen sign-in code                                                        |
| Code email heading         | Your VIRZEEN Member Profile Code                                                           |
| Code email intro           | Here's the one-time code you asked for:                                                    |
| Code email, after the code | This code expires in 10 minutes.                                                           |
| Code email, small print    | If you didn't ask for this code, you can ignore this email. Nobody can sign in without it. |
| Order emails, last line    | Questions? Reply to this email and we'll help.                                             |
| Footer (every email)       | © {year} Virzeen. All rights reserved. · Privacy policy · Get help                         |

## Formatting

- Money: `Rs 1,250` (via `<Price>`, which keeps each amount on one line), never "NPR 1250" or "Rs.1250". Where only text fits (an accordion title, an aria-label), use `formatPaisa()`.
- Dates: `28 Sep 2026`; with time `28 Sep 2026, 3:45 PM` (Asia/Kathmandu).
- Order numbers shown exactly as stored: `VZ-260928-0042`.
- Counts take the right plural: "1 product", "2 products". Never "product(s)".
- Numbers from 1,000 up are grouped: "4,000 characters", "100,000 or less".
- Phone numbers in order details are tap-to-call links.
