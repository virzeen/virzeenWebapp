# Member area, laid out like Nike's (Interests, recommendations, Settings)

Status: built 2026-11-14 (Delete account pending the owner's rule).
Source: the owner's package `nike-member-ui-package` (spec and 19 screenshots of Nike Singapore's member area, desktop). Only the layout, structure and states are followed. Nike's pictures, logos and wording are not used; the copy is Virzeen's.

## Owner decisions (2026-11-14)

- **Interests** = the Virzeen categories and collections a member likes (not Nike's Sports / Teams / Athletes / Cities). Saved per member and used to choose "Find your next favourite".
- **Settings**: all 8 sections of Nike's, adapted to Virzeen: no ad-data or workout-data toggles (Virzeen shares nothing), no saved cards.
- **"Nike Apps" block**: left out (no published app).
- Not built: the location toast and the bag-reminder popover (site chrome, not the member area).

## Profile (`/account`), top to bottom

1. Identity: circle, name (h1, id `profile-name`), "Member since {month year}". (Already built.)
2. The points card (`WalletPanel`). Kept from the earlier request; Nike has no equivalent.
3. **Interests**: h2 "Interests" with an "Edit" link on the right; a tab row **All · Categories · Collections** (active one underlined black, a thin line under the row); the line "Add your interests to shop a collection of products that are based on what you're into."; then a row of square tiles. With none saved: one light-grey square tile with a ⊕ and "Add interests". With some: one tile per interest (its name) and the Add tile last. "Edit" and the Add tile open a dialog listing every live category and collection as checkboxes (up to 12 in all may be chosen) with Save.
4. **Find your next favourite**: a sideways row of product cards (the shared `ProductCarousel`): live products in the member's chosen categories or collections that they have not already favourited, newest first, up to 12. With no interests, or none left to show, the newest live products. Early-access rules apply (a member sees early drops, nobody else).
5. **Member Benefits**: the image cards from `specs/member-benefit-pages.md`, tiles with **square corners** as in Nike's screenshot, the name under each.
6. Favourites row, then "Notify me" when there are requests. (Kept; the owner asked for the Favourites row earlier.)

## Settings (`/account/settings/...`)

Shell as built (list on the left from md, the open section on the right, a list of rows on phones). The list becomes Nike's eight, each a 24px line icon and a label:

| Section                   | Route                                         | What it holds                                                                                                                                                 |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account details           | `/account/settings` (and `/details`)          | Name, email (read only), a Password row with an "Edit" link to `/account/settings/password`, date of birth (locked once set), Sign out                        |
| Payment methods           | `/account/settings/payment-methods`           | "Saved payment methods": Virzeen keeps no cards. States the three ways to pay (eSewa, Khalti, Cash on Delivery) and a "Payment options" button to `/shipping` |
| Delivery addresses        | `/account/addresses`                          | The address book (built)                                                                                                                                      |
| Shop preferences          | `/account/settings/shop-preferences`          | Shopping preference (Home, Clothing, Both: the existing sign-up field), clothing size, unit of measure (Metric or Imperial)                                   |
| Communication preferences | `/account/settings/communication-preferences` | "Yes, send me emails." (the existing marketing tick)                                                                                                          |
| Profile visibility        | `/account/settings/profile-visibility`        | The name shown on product reviews: first name (today's behaviour, the default), full name, or anonymous                                                       |
| Linked accounts           | `/account/settings/linked-accounts`           | Read only: Google if the member signs in with it, otherwise "You don't have any connected apps or services."                                                  |
| Privacy                   | `/account/settings/privacy`                   | "Download your data" and "Delete account" (rules below)                                                                                                       |

Save buttons are disabled until a field changes, then black. Each saves through a Server Action with its own rate limit.

## Privacy rules

- **Download your data**: one JSON file of what the member gave us: profile (name, email, birthday, preferences), addresses, favourites, reviews, notify-me requests, interests, points and credit lines, orders (number, date, status, totals, items). Never password hashes, sessions, tokens, 2FA secrets or other members' data.
- **Delete account**: the docs say nothing about deleting an account, so this is the owner's decision. Orders cannot be removed from the shop's books (`Order.userId` is `Restrict`), so deleting would mean anonymising. Until the owner decides, the section says to contact us (`/contact`) and has no delete button.

## Acceptance

- Interests: saving replaces the member's set; unknown or archived ids are refused; more than 12 are refused; another member's interests are never read or changed.
- Find your next favourite never shows a product the viewer may not see (hidden drafts, early-access drops before the viewer's time) and never a product already in their favourites.
- Every Settings Save is disabled until the form changes.
- The profile, orders, favourites and settings pages keep working at 360, 768 and 1280px with no horizontal scroll.
