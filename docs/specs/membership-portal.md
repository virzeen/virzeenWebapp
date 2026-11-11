# Spec: Membership portal (Free MONO Member and Monochrome Pass)

**Status:** Phase 1 built, branch `feat/checkout-v2`
**Owner approval:** owner, 2026-11-11 in chat (the guide, then answers to the four questions below)
**Related docs:** `docs/Monochrome Membership & Store Features — Implementation Guide.md` (the source for every benefit); `specs/checkout-v2-week1.md`; `specs/sign-in-v2.md`; `payments/payment-policy.md` §10

## Goal

Three levels: **Guest**, **MONO Member** (free account) and the **Monochrome Pass** (paid, bought only inside a MONO Member account). Give each member a portal that shows their level and what it gives: a plain card and the free benefits for a MONO Member, a black "metal" card and the full Pass benefits for the Pass, and an upgrade offer for members without it.

## Owner decisions (2026-11-11)

| Question          | Answer                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What to build now | The member portal UI first. Real data where it exists today; "Soon" on the rest. The Pass can't be bought until online payment is on.                        |
| Pass price        | Rs 2,999 for 6 months, Rs 4,599 for a year (the guide's tables, not its copy).                                                                               |
| Returns           | Free pickup **only for the Pass** (15 days). Guest and MONO Member: 7 days, customer pays pickup. This replaces the earlier "free returns for MONO Members". |
| Points            | 1 point per Rs 1,200 (MONO Member), 2 per Rs 1,200 (Pass). Not built yet (shown as Soon).                                                                    |

## What is built

- **Data:** `User.passStartsAt`, `passEndsAt` (migration `20261111140000_member_pass`, additive). The level is the Pass while `passEndsAt` is in the future (`levelOf`, `memberService.membership`).
- **Granting a Pass:** `pnpm admin pass <email> <6|12>` (renews from the end date if one is running) and `pnpm admin pass-end <email>`. This is the "admin button" of the guide until the Pass can be bought online.
- **Catalog:** `@virzeen/validators/membership` holds the levels, the Pass plans, every benefit of the guide by level, the headline lines and which benefits work today (`live`). One list feeds the portal, the Membership page and the tests.
- **Primitive:** `MembershipCard` (`level="member"` grey, `level="pass"` black with a faint sheen and an inner hairline frame), with stories and a catalog row.
- **Profile (`/account`):** the member's card, the level's headline benefits, "See every benefit"; a free member also sees the Pass offer (black card, benefits, the two plans, a disabled "Pass opens soon").
- **Membership page (`/membership`, public):** three level cards (the viewer's marked), "Log in to get the Pass" for guests, and the side-by-side table of every benefit by group with the viewer's whole column in bold.

## Not built (shown as "Soon")

Everything that needs new back-end: Pass delivery and 10% discount at checkout, points and credit wallet, Express Delivery (3 hours in Kathmandu and Pokhara: 1 a month for a MONO Member, 3 a month for the Pass; none for guests) and the missed-dispatch credit, early access, member-only products, reserve and price lock, referrals, birthday and anniversary rewards, gift wrap pricing, pause, the Pass purchase itself, the daily expiry job. The `live` list in the catalog says what works; flip a benefit's `live` when its part ships.

## Guide points to settle later

- The guide's guest copy says "3-day returns" in one place and 7 days in its table. The site uses 7 days.
- Express Delivery is its own benefit (owner 2026-11-11), not a dispatch time: Pass dispatch is 24 hours. Size exchange and reserve limits are copied as written.

## Tests

Core: `memberService` Pass (level, grant 6 and 12 months, renewal, expiry, end, unknown email). E2E `membership.spec.ts`: a free member's profile (card, highlights, Pass offer with its disabled button), a Pass member's profile (black card, valid-until date, no offer), the public Membership page for a guest. Storybook: `MembershipCard` stories.
