# Member benefit pages and the profile's benefits row

Status: built 2026-11-14. Owner request (2026-11-13/14): "make it same as Nike's member exclusive products page; the profile has the profile first, then membership benefits in a carousel, then favourites in a carousel; the benefits are images, and when a member clicks one it opens a page like that."
Reference: nike.com/sg/membership/exclusive-products (public, read 2026-11-14). Nike's own profile page needs a sign-in, so its layout was taken from the earlier profile work (specs/membership-portal.md).

## Profile (`/account`)

Order: the profile header (initial, name, "Member since"), the points card (`WalletPanel`), **Membership benefits** (a sideways row), **Favourites** (a sideways row), then "Notify me" when there are requests.

The benefits row is a row of **image cards**, like Nike's "Member Benefits": a wide picture, the benefit's name under it and one short line. 1 card and a peek of the next on phones, 2 from 768px, 3 from 960px; previous/next buttons from md. Each card is one link to the benefit's page. The interactive perk cards (birthday date, referral code, Express left) are no longer in the row: they live on the benefit pages below and on the Membership portal (`/account/membership`), which is unchanged.

## Benefit page (`/membership/benefits/[slug]`)

Public, like Nike's page, and laid out the same way:

1. A full-width picture (4:5 on phones, 16:9 from md).
2. A narrow text column: the benefit's name as the h1 and an intro of two or three sentences.
3. A picture with a heading, a paragraph and a black pill button (Nike's "A Shop Just for Members" block). The button is "Shop" for most and "See your points" for points; a guest sees "Sign in" instead (it returns to the page).
4. **Your {benefit}** (members only): the live card from the Membership portal for that benefit: Express left this month, the birthday date field, the early-access drops waiting now, the gift-wrap price, the referral code and its field for a friend's code. Guests see the rules in the intro and the "Sign in" button above.
5. "Member Benefits": the same row of image cards, without the one being read.

Slugs: `express-delivery`, `birthday-reward`, `early-access`, `gift-wrapping`, `refer-a-friend`, `points`. An unknown slug is a 404. The copy and the picture of each benefit are in one file (`client/features/membership/benefit-pages.ts`); the amounts in it come from `@virzeen/validators/limits`, so a rule change in one place changes the page.

## Pictures

Each benefit has a card picture and a page picture, as paths in `benefit-pages.ts`. Express Delivery, Early access and Refer a friend use free Unsplash photos saved in `apps/web/public/brand/benefits/` (Unsplash photo ids: `5u5IQyQdfkM` parcel, `Yy4sN6QzboU` hangers, `htxj5lCVlF0` and `TCRLTA0fATQ` friends, `PZQQ2RC3D38` city; Unsplash licence, no credit required). Birthday reward, Gift wrapping and Points still use crops of the brand picture (`/brand/hero-1600.webp`: the flowers, the shelf, the reader) until a suitable photo is added. The cards' corners are `rounded-xl`. To change one: put a photo in `apps/web/public/brand/benefits/` and change its `src` in the file. No code elsewhere changes.

## Not built

Per-member pictures, a page for every line of the guide's table (only the six above), and a "Member-only products" page (the member-only products perk is not built, `live: []`).
