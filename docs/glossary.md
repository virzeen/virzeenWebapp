# Glossary

Use these exact terms in code, UI copy, and docs. If you need a new term, add it here first.

## Commerce

| Term           | Meaning                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product        | A sellable item shown on one product page (e.g. "Linen Overshirt")                                                                                   |
| Variant        | A specific buyable version of a product (size + color). Stock and price live here                                                                    |
| SKU            | Unique code for a variant, format `VZ-<PRODUCT>-<COLOR>-<SIZE>`                                                                                      |
| Style          | A colour or design of a product with its own photos, price and stock (a variant `color`), like Nike's colourways. Customers pick it with style tiles |
| Product number | A product's number, e.g. `0042`, given in creation order and never reused                                                                            |
| Style number   | A style's code, `VZ<product number>-101`, `-102`… in the order styles were added; kept on rename, never reused. Shown as "Style: VZ0042-101"         |
| Colour shown   | The colours a style shows, e.g. "Black/White"; the style's name when not set                                                                         |
| Size guide     | A size table (Clothing) or one size chart picture (Accessories), made once in admin and picked on products; customers open it from "Size guide"      |
| Favourite      | A product and style a customer saved; guests' stay in the browser until they sign in                                                                 |
| Collection     | Curated group of products (marketing). Different from Category                                                                                       |
| Category       | Structural classification (Tops, Bottoms, Accessories)                                                                                               |
| Cart           | Pre-order basket. Guest carts are tied to a cookie `cartId`; merged into the user's cart on login                                                    |
| Order          | A confirmed purchase. Has an order number `VZ-YYMMDD-XXXX`                                                                                           |
| Order item     | A line in an order with a **snapshot** of name, SKU, and unit price at purchase time                                                                 |
| Paisa          | 1/100 of a Nepali rupee. All money is stored as integer paisa                                                                                        |
| Subtotal       | Sum of order item prices before shipping                                                                                                             |
| Total          | Subtotal + shipping (VAT-inclusive prices, see payment-policy)                                                                                       |
| Reservation    | Stock held for an unpaid order until payment succeeds or expires                                                                                     |
| Fulfilment     | Packing and shipping a paid (or COD-confirmed) order                                                                                                 |

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
