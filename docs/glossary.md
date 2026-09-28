# Glossary

Use these exact terms in code, UI copy, and docs. If you need a new term, add it here first.

## Commerce

| Term        | Meaning                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------- |
| Product     | A sellable item shown on one product page (e.g. "Linen Overshirt")                                |
| Variant     | A specific buyable version of a product (size + color). Stock and price live here                 |
| SKU         | Unique code for a variant, format `VZ-<PRODUCT>-<COLOR>-<SIZE>`                                   |
| Collection  | Curated group of products (marketing). Different from Category                                    |
| Category    | Structural classification (Tops, Bottoms, Accessories)                                            |
| Cart        | Pre-order basket. Guest carts are tied to a cookie `cartId`; merged into the user's cart on login |
| Order       | A confirmed purchase. Has an order number `VZ-YYMMDD-XXXX`                                        |
| Order item  | A line in an order with a **snapshot** of name, SKU, and unit price at purchase time              |
| Paisa       | 1/100 of a Nepali rupee. All money is stored as integer paisa                                     |
| Subtotal    | Sum of order item prices before shipping                                                          |
| Total       | Subtotal + shipping (VAT-inclusive prices, see payment-policy)                                    |
| Reservation | Stock held for an unpaid order until payment succeeds or expires                                  |
| Fulfilment  | Packing and shipping a paid (or COD-confirmed) order                                              |

## Order status (`OrderStatus`)

`PENDING` (created, awaiting payment) · `CONFIRMED` (paid, or COD accepted) · `PROCESSING` (being packed) · `SHIPPED` · `DELIVERED` · `CANCELLED` · `RETURNED`

## Payment status (`PaymentStatus`)

`UNPAID` · `PENDING` (sent to provider, result unknown) · `PAID` · `FAILED` · `EXPIRED` · `REFUNDED` · `PARTIALLY_REFUNDED` · `COD_DUE` · `COD_COLLECTED`

## Payment providers

| Term               | Meaning                                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| eSewa ePay v2      | Form-redirect gateway. Signed with HMAC-SHA256. Verified via status check API        |
| Khalti KPG-2       | API gateway. Server initiates → gets `pidx` + `payment_url`. Verified via lookup API |
| COD                | Cash on Delivery. Paid to courier on delivery                                        |
| `transaction_uuid` | Our unique id per eSewa payment attempt                                              |
| `pidx`             | Khalti's id for one payment attempt                                                  |
| Reconciliation     | Cron job that re-checks PENDING payments with the provider                           |

## Portfolio

| Term     | Meaning                                                    |
| -------- | ---------------------------------------------------------- |
| Project  | A portfolio case study (campaign, lookbook, collaboration) |
| Lookbook | A styled image series that can link to products            |

## Roles

`CUSTOMER` · `ADMIN` (full access, 2FA required) · `STAFF` (orders only, phase 2)
