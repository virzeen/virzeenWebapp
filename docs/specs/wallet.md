# Spec: Points and credit wallet

**Status:** Built, branch `feat/checkout-v2` (migration `20261111160000_wallet`)
**Owner approval:** owner, 2026-11-11 in chat ("Go for it" to the points and credit wallet; rates from the Monochrome guide and the owner's 1 point per Rs 2,999, changed 2026-11-13)
**Related docs:** `docs/Monochrome Membership & Store Features — Implementation Guide.md` §4 and "Guardrails"; `specs/membership-portal.md`; `payments/payment-policy.md` §2

## Goal

Members earn points when an order is delivered, hold credit (from the shop), and spend both at checkout. Guests have no wallet.

## Rules

| Rule            | Value                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Earning         | On **delivered** orders: **1 point per Rs 1,200 paid** (the order's total), **2 per Rs 1,200** for the Pass tier. Once per order. Guests earn none.     |
| Points expiry   | MONO Member points expire **12 months** after they are earned. Pass points never expire. (A refund of spent points never expires.)                      |
| Points value    | **1 point = Rs 1.**                                                                                                                                     |
| Spending points | At most **20% of the products' price after any discount**, in whole points, never more than the order total.                                            |
| Credit          | Rupees, never expires. Sources today: an admin adds it (a goodwill credit or gift). Later: referrals, missed dispatch, price drops.                     |
| Order of use    | Points first, then credit for what is left of the total (delivery included). The customer chooses each with a tick at the Payment step.                 |
| Total           | `total = subtotal − discount + delivery − points − credit`, worked out only on the server; VAT is the share in what is actually paid.                   |
| Cancelling      | Points and credit an order spent go back (a REFUND line each) when it is cancelled for any reason: customer, admin, refused, failed or expired payment. |
| Free orders     | If credit covers everything, only cash on delivery can place it (online payment needs a total above zero).                                              |

## Data

`WalletEntry` (ledger): `kind` (POINTS or CREDIT), `type` (EARN, SPEND, EXPIRE, REFUND, ADJUST), signed `amount` (points, or paisa), `remaining` (what of an adding line is still unspent), `expiresAt`, `orderId`, `reason`. Unique per `(orderId, type, kind)`, so earn, spend and refund happen at most once per order. Balance = the sum of `remaining`. Spending takes from the soonest-to-expire line first; expiry zeroes what is left of lines past their date and writes an EXPIRE line (done when the balance is read or spent, so there is no daily job to run). `Order.pointsUsed` and `Order.creditUsedPaisa` record what an order spent.

Spending locks the member's row inside the order transaction, so two checkouts can't spend the same points.

## Where it shows

- **Checkout, Payment step (members with a balance):** "Use my credit (Rs X available)" and "Use my points (N available)", then "Points (N)" and "Credit" lines in the summary and Order Review, and the lower total. `previewCheckoutAction` and `placeOrderAction` take `usePoints` and `useCredit` (also `/api/v1/checkout`, `docs/backend/api-contract.md`).
- **`/account/membership`:** the "Redeem points" card (the balance, what it is worth, points expiring first, credit when above zero) with the silver Virzeen coin (`CoinStack`: hover or tap spins it, it jumps and lands on a pile of coins; owner 2026-11-13), and the newest 20 lines.
- **Admin → Customers:** each customer's points and credit, and "Add credit" (credit in whole rupees or points, with a reason; audited as `wallet.add`).

## Not built

Points clawback when a delivered order is returned; double-points days; credit from referrals, missed dispatch and price drops; paying for a Pass with points; showing wallet lines on the order page and in emails.

## Tests

Core: earning (Member 1x with a one-year expiry, Pass 2x with none, once, not before delivery, not for guests); expiry once; spending soonest-expiring first; the 20% cap and total; credit only when asked and never above the total; online payment refused at zero; refund on cancel once; admin add and its refusals. E2E `wallet.spec.ts`: spend credit and points at checkout (totals, review, balances after) and no choices without a balance; admin journey adds credit.
