# Content Style (UI copy)

Consistent words make the brand feel premium and reduce support questions. Use these exact strings. New common strings are added here first.

## Voice

Calm, warm, confident. Short sentences. Sentence case. No exclamation marks in errors, no blame ("You entered an invalid…" → "Enter a 10-digit mobile number").

## Standard actions

| Action              | Text                                   |
| ------------------- | -------------------------------------- |
| Add product to cart | Add to bag                             |
| Open cart           | Bag (icon label: "Open bag")           |
| Go to checkout      | Checkout                               |
| Submit order        | Place order                            |
| Online payment      | Continue to eSewa / Continue to Khalti |
| Retry               | Try again                              |
| Save form           | Save                                   |
| Remove line         | Remove                                 |
| Undo                | Undo                                   |
| Sign in             | Sign in (not "Log in")                 |

## Standard messages

| Situation                  | Message                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Added to bag (toast)       | Added to bag                                                                                     |
| Removed (toast)            | Removed from bag — Undo                                                                          |
| Empty bag                  | Your bag is empty. — [Browse the collection]                                                     |
| No orders                  | You haven't placed any orders yet. — [Start shopping]                                            |
| No search results          | Nothing matches "{query}". Try a different word or browse all products.                          |
| Out of stock               | Out of stock                                                                                     |
| Low stock                  | Only {n} left                                                                                    |
| `OUT_OF_STOCK` at checkout | Some items just sold out. We've updated your bag.                                                |
| `PRICE_CHANGED`            | A price changed since you added this item. Please review your bag.                               |
| `PAYMENT_FAILED`           | Payment didn't go through. Your bag is saved — try again or choose another method.               |
| `PAYMENT_PENDING`          | We're confirming your payment. This usually takes a minute — you'll get an email when it's done. |
| `RATE_LIMITED`             | Too many attempts. Please wait a minute and try again.                                           |
| `INTERNAL` / unknown       | Something went wrong on our side. Please try again.                                              |
| Order confirmed            | Thank you — your order {orderNumber} is confirmed.                                               |

## Field errors

| Field    | Error                                                 |
| -------- | ----------------------------------------------------- |
| Required | Enter your {field}                                    |
| Phone    | Enter a 10-digit mobile number starting with 97 or 98 |
| Email    | Enter a valid email address                           |
| OTP      | Enter the 6-digit code we sent to {email}             |

## Formatting

- Money: `Rs 1,250` (via `<Price>`), never "NPR 1250" or "Rs.1250".
- Dates: `28 Sep 2026`; with time `28 Sep 2026, 3:45 PM` (Asia/Kathmandu).
- Order numbers shown exactly as stored: `VZ-260928-0042`.
