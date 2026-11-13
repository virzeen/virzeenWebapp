# Spec: Member perks (gift wrapping, birthday reward, Express Delivery, referrals, early access)

**Status:** Built: gift wrapping, birthday reward, Express Delivery, referrals and early access. Branch `feat/checkout-v2` (migration `20261113100000_member_perks`)
**Owner approval:** owner, 2026-11-13 in chat (the answers below)
**Related docs:** `docs/Monochrome Membership & Store Features — Implementation Guide.md`; `specs/membership-portal.md`; `specs/wallet.md`; `payments/payment-policy.md` §2

## Goal

Build the benefits of the guide that a MONO Member (free account) gets, and the Pass version where the guide gives the Pass one. One list in `@virzeen/validators/membership` says which are live.

## Owner decisions (2026-11-13)

| Question         | Answer                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What to build    | Referral codes, gift wrapping, birthday reward, Express Delivery, and early access.                                                                                                         |
| Birthday reward  | An automatic discount in the birthday month (a promo code replaces it, like the Pass 10%).                                                                                                  |
| Express Delivery | At checkout a member picks normal or Express delivery. A MONO Member gets 1 a month, the Pass 3; once the month's are used the option shows "used this month". No fee. Guests don't get it. |
| Early access     | MONO Member 12 hours early, Pass 48 hours early (the guide's numbers, owner confirmed).                                                                                                     |

## Rules

| Perk          | Guest  | MONO Member                                            | Pass                                                        |
| ------------- | ------ | ------------------------------------------------------ | ----------------------------------------------------------- |
| Gift wrapping | Rs 150 | Rs 100                                                 | Free                                                        |
| Birthday      | none   | 5% off the products, the whole birthday month          | 15% off the products in the birthday month (instead of 10%) |
| Express       | none   | 1 a month                                              | 3 a month                                                   |
| Referral      | none   | Rs 200 credit when a friend's first order is delivered | Rs 300 credit, and the friend gets 1 month of the Pass free |
| Early access  | none   | A new product is visible and buyable 12 hours early    | 48 hours early                                              |

- **Gift wrapping:** a tick at checkout. It is added to the total (VAT included like everything else) and shown on the order and in admin. It is not part of the base for the 20% points cap.
- **Birthday:** the month of `User.birthday`, in Nepal time. It is the "member discount" of the order: a promo code replaces it. A Pass member in their birthday month gets 15% instead of the usual 10%. Guests never get it.
- **Express:** only for a delivery address in the Kathmandu Valley or Pokhara (Kaski). The quota is counted per calendar month in Nepal time from the member's non-cancelled orders marked Express, so cancelling gives the use back. The member's row is locked while the order is made, so two checkouts can't use the same one. Orders confirmed 9 AM to 6 PM are promised within 3 hours; later ones by 11 AM the next day.
- **Referral:** every member has one code. A friend (a new member with no order yet, not yet referred) enters it once in their portal. When the friend's first order is delivered the member gets the credit (a wallet line), once. If the referrer has the Pass at that time, the friend also gets 1 month of the Pass. A member can't use their own code.
- **Early access:** a product has an optional `publicAt`. Before it, only signed-in members inside their window (12 or 48 hours before `publicAt`) can see and buy it. Everyone else sees it only from `publicAt`.

## Admin

- Orders: an Express badge and a Gift wrap badge in the list and on the order page.
- Customers: referral code and referrals made.
- Referrals page: every referral, its state and the reward.
- Products list: an "Early access" button per product sets the "Public from" time (audited as `product.public-at`) and a badge shows while it is in the future. The product editor is not changed.
- Referrals page (`/admin/referrals`): every referral, its state and the reward.

## Where it shows

The member portal (`/account/membership`) has a perks grid under the points card: Express Delivery left this month, the birthday reward (and a one-time birthday field for a member without one), early access (with the drops waiting), gift wrapping and the referral code (copy button, and a field for a friend's code). Checkout (Payment step) has Delivery speed (members), gift wrapping and the totals lines; the order page and admin list show Express and Gift wrap badges. Tests: core `perks.test.ts`, `referral.test.ts`, `early-access.test.ts`; e2e `perks.spec.ts` and steps in `admin.spec.ts`.

## Notes

- A birthday can be saved once (portal), so a member can't move the reward to a month that suits; there is no check that the date is true.
- Early access is per viewer and only for new products (`Product.publicAt`); the public rule hides a product from lists, search, its page and the bag. Favourites, "Notify me" and the sitemap keep the public rule. Festival sales have no early access (there is no sale entity).
- Points and credit are not part of the referral reward: it is a credit line on the member's wallet, never expiring.
- A returned first order doesn't take the referral reward back.

## Not built

Festival-sale early access (there is no sale entity yet), paid Express, the missed-dispatch credit, the 3-hour timer itself (the promise is shown; dispatch is manual).
