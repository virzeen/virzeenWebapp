# Member area, laid out like Nike's (Your picks, recommendations, Settings)

Status: built 2026-11-14.
Source: the owner's package `nike-member-ui-package` (spec and 19 screenshots of Nike Singapore's member area, desktop). Only the layout, structure and states are followed. Nike's pictures, logos and wording are not used; the copy is Virzeen's.

## Owner decisions (2026-11-14)

- **Picks** (Nike's "Interests", in our own words; owner 2026-11-14: "rename the interests to different words") = the Virzeen categories and collections a member likes (not Nike's Sports / Teams / Athletes / Cities). Saved per member and used to choose "Find your next favourite".
- **Settings**: Nike's sections adapted to Virzeen, six of the eight: **Shop preferences and Linked accounts were removed** (owner 2026-11-14; their size and unit columns were dropped, migration `20261114140000_member_settings_trim`). No ad-data or workout-data toggles (Virzeen shares nothing), no saved cards.
- **"Nike Apps" block**: left out (no published app).
- Not built: the location toast and the bag-reminder popover (site chrome, not the member area).

## Profile (`/account`), top to bottom

1. Identity: circle, name (h1, id `profile-name`), "Member since {month year}". (Already built.)
2. The points card (`WalletPanel`). Kept from the earlier request; Nike has no equivalent.
3. **Your picks**: h2 "Your picks" with an "Edit" link on the right; a tab row **All · Categories · Collections** (active one underlined black, a thin line under the row); the line "Pick the categories and collections you love, and we will line up products to match."; then a row of square tiles. With none saved: one light-grey square tile with a ⊕ and "Add picks". With some: one tile per interest (its name) and the Add tile last. "Edit" and the Add tile open a dialog listing every live category and collection as checkboxes (up to 12 in all may be chosen) with Save.
   3a. **The Monochrome Pass offer** (moved here from the Membership page, owner 2026-11-14, "put this layer after Your picks and remove the membership panel from there"): the black card, the headline benefits and the two plans, with the disabled "Pass opens soon" button. Only members without a Pass see it; the Membership page no longer shows it.
4. **Find your next favourite**: a sideways row of product cards (the shared `ProductCarousel`): live products in the member's chosen categories or collections that they have not already favourited, newest first, up to 12. With no interests, or none left to show, the newest live products. Early-access rules apply (a member sees early drops, nobody else).
5. **Member Benefits**: the image cards from `specs/member-benefit-pages.md`, tiles with **square corners** as in Nike's screenshot, the name under each. The pictures are **black and white** (owner 2026-11-14: a grayscale filter, `grayscale contrast-110`), on the profile and on the benefit pages.
6. Favourites row, then "Notify me" when there are requests. (Kept; the owner asked for the Favourites row earlier.)

## Settings (`/account/settings/...`)

Shell as built (list on the left from md, the open section on the right, a list of rows on phones). The list is Nike's, less Shop preferences and Linked accounts (removed by the owner, 2026-11-14), six in all, each a 24px line icon and a label:

| Section                   | Route                                         | What it holds                                                                                                                                                                                           |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account details           | `/account/settings` (and `/details`)          | Name, email (read only), a Password row with an "Edit" link to `/account/settings/password`, date of birth (locked once set), Sign out                                                                  |
| Payment methods           | `/account/settings/payment-methods`           | Just "Cash on delivery", the one method offered at launch, as a tick. **No Save button**: a tick (or untick) saves at once (`User.preferredPaymentMethod`, toast "Saved"). Checkout does not use it yet |
| Delivery addresses        | `/account/addresses`                          | The address book (built)                                                                                                                                                                                |
| Communication preferences | `/account/settings/communication-preferences` | "Yes, send me emails." (the existing marketing tick)                                                                                                                                                    |
| Profile visibility        | `/account/settings/profile-visibility`        | The name shown on product reviews: first name (today's behaviour, the default), full name, or anonymous                                                                                                 |
| Privacy                   | `/account/settings/privacy`                   | "Download your data" and "Delete account" (rules below)                                                                                                                                                 |

Save buttons are disabled until a field changes, then black. Each saves through a Server Action with its own rate limit.

## Privacy rules

- **Download your data**: one JSON file of what the member gave us: profile (name, email, birthday, preferences), addresses, favourites, reviews, notify-me requests, picks, points and credit lines, orders (number, date, status, totals, items). Never password hashes, sessions, tokens, 2FA secrets or other members' data.
- **Delete account** (Account details, as Nike's): the docs were silent, so the rule was proposed in the chat on 2026-11-14 and built on the owner's "make sure it's all done". Orders and the points and credit ledger are the shop's records (`Order.userId` is `Restrict`), so the account is **anonymised, not erased**: sign-in methods, sessions, two-factor, addresses, favourites, reviews, notify-me requests, interests, the bag and sign-in codes are deleted; the account row becomes "Deleted member" with a `deleted-{id}@deleted.invalid` email and no birthday, preferences, referral code or Pass dates, so the email can start a fresh account. Refused while an order is PENDING, CONFIRMED, PROCESSING or SHIPPED, and for admins. The member types DELETE to confirm; an audit line `account.delete` is kept. Not built: asking for a recent sign-in first.

## Acceptance

- Picks (code and database still say interests): saving replaces the member's set; unknown or archived ids are refused; more than 12 are refused; another member's interests are never read or changed.
- Find your next favourite never shows a product the viewer may not see (hidden drafts, early-access drops before the viewer's time) and never a product already in their favourites.
- Every Settings Save is disabled until the form changes.
- The profile, orders, favourites and settings pages keep working at 360, 768 and 1280px with no horizontal scroll.

## Account menu (header profile icon)

Seen on nike.com/sg on 2026-11-14 (signed out; the signed-in menu needs a sign-in, so its list is Nike's known one, not read live):

- **Signed out:** Nike's top strip shows plain links `Find a Store | Help | Join Us | Sign In`. Hovering Sign In opens nothing. Ours matches: the profile icon is a plain "Sign in" link, no menu.
- **Signed in:** Nike's strip shows `Hi, {name}` with the person icon; resting the pointer there opens a small white card (8px corners, soft shadow, bold title, small grey items, dark on hover) just under the icon, right-aligned, like its Help menu (Order Status, Delivery, Returns…). Ours: the icon (still a link to `/account`) opens, on hover or keyboard focus, a white card titled `Hi, {first name}` with **Profile, Orders, Favourites, Account settings, Sign out**. Nike's Inbox and Experiences have no Virzeen equivalent. The card stays white over the dark home hero (`tone-default`). From md; phones keep the Menu sheet.

## "Select your picks" dialog and sideways rows

- The dialog is Nike's "Select your interests" (owner's screenshot, 2026-11-14): a large title with no line under it, the tab row (All, Categories, Collections) full width over a hairline, then a scrolling list of rows inset from the sides, each a square 80px photo, the name (with "Category" or "Collection" small under it) and a box on the right, a hairline between rows; Cancel and Save pills at the bottom, with "{n} of 12 chosen" on the left. The photo is the first photo of the newest product in it that the member may see (never a draft or an early drop before their time); with none, a light-grey square. Built as `Dialog size="picker"` and `Checkbox media boxAtEnd`.
- **Sideways rows and the wheel** (owner: scrolling stopped while the pointer was over a card photo and started again over white space, and the row scrolled up and down inside itself): the rows are `overflow-y: hidden`, and `useVerticalWheel` (`client/lib/use-vertical-wheel.ts`) takes over a wheel or trackpad tick that is mostly vertical and scrolls the page itself, eased, because a sideways row otherwise takes the whole tick when it has any sideways part (a tilted wheel, a trackpad's drift: shown with a 4px sideways drift, the page moved 0px) and never passes the vertical part on. Mostly sideways ticks still scroll the row.
- **Heart on each card** (owner 2026-11-14): every card in a product carousel (Find your next favourite, the home page's new arrivals, the product page's rows, the bag's row) has a round heart in the top right corner of the photo (`ProductCardHeart`). It saves the product in its first style, shows "Added to favourites" and, pressed again, "Removed from favourites". Not in the admin preview, and not on the profile's own Favourites row (all saved already).
- Phone menu: a signed-in member gets a "Sign out" row as the last row, under Help.
