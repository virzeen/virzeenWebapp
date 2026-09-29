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
| `RATE_LIMITED`             | Too many attempts. Please wait a few minutes and try again.                                      |
| `DELIVERY_FAILED`          | We couldn't send your code. Please try again in a few minutes.                                   |
| `INTERNAL` / unknown       | Something went wrong on our side. Please try again.                                              |
| Order confirmed            | Thank you — your order {orderNumber} is confirmed.                                               |

## Field errors

| Field    | Error                                                 |
| -------- | ----------------------------------------------------- |
| Required | Enter your {field}                                    |
| Phone    | Enter a 10-digit mobile number starting with 97 or 98 |
| Email    | Enter a valid email address                           |
| OTP      | Enter the 6-digit code we sent to your email          |

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

- Money: `Rs 1,250` (via `<Price>`), never "NPR 1250" or "Rs.1250".
- Dates: `28 Sep 2026`; with time `28 Sep 2026, 3:45 PM` (Asia/Kathmandu).
- Order numbers shown exactly as stored: `VZ-260928-0042`.
