# Monochrome Membership & Store Features — Implementation Guide

Nov 10, 2026 · @Harry

## Overview

The store runs three customer levels: Guest, Free Account and a paid Monochrome Pass. Each level gets more, so every visitor has a reason to sign up and every account has a reason to upgrade. The store sells black-and-white home goods (vases, cutlery, small décor) and clothing, in a Zara Home style.

**Goals**

- Turn one-time buyers into repeat customers.
- Build our own contact list (phone and email) so launches do not depend on Instagram reach.
- Bring in membership income before any product is sold.
- Make the brand feel premium through service: fast dispatch, easy returns, styling help.

**The three levels**

| Level           | How to join           | Price                                      | Who it is for                     |
| --------------- | --------------------- | ------------------------------------------ | --------------------------------- |
| Guest           | No sign-up            | Free                                       | First-time visitors, quick buyers |
| Free Account    | Phone number or email | Free                                       | Anyone who buys more than once    |
| Monochrome Pass | Paid membership       | Rs. 2999 for 6 months, Rs. 4599 for a year | Loyal and high-value customers    |

Prices are starting points. Check them against your real margins before launch (see Costs and pricing math).

## Benefits by level

The Pass carries most of the value. The Free Account gets enough to make signing up worth it, and the Guest level stays simple. A dash means the level does not get that benefit.

### Delivery and dispatch

| Benefit                                  | Guest           | Free Account    | Monochrome Pass                                                                             |
| ---------------------------------------- | --------------- | --------------- | ------------------------------------------------------------------------------------------- |
| Delivery fee                             | Rs. 200         | Rs. 150         | Free, no minimum                                                                            |
| Free delivery threshold                  | Above Rs. 4,000 | Above Rs. 3,000 | Every order                                                                                 |
| Dispatch time                            | Within 48 hours | Within 24 hours | Within 3 hours (3 orders a month), then within 24 hours within Kathmandu and Pokhara Valley |
| Missed dispatch promise                  | —               | —               | Rs. 100 credit automatically                                                                |
| Express delivery in your city            | Paid            | Paid            | 1 free per month                                                                            |
| Priority packing                         | —               | —               | Packed first                                                                                |
| Choose a delivery time slot              | —               | —               | Morning, afternoon or evening and time as well                                              |
| Free delivery to a second address (gift) | —               | —               | ✓                                                                                           |
| Cancel before dispatch                   | ✓               | ✓               | ✓ instant refund to wallet                                                                  |
| Cash on delivery                         | ✓               | ✓               | ✓                                                                                           |

### Savings and rewards

| Benefit                                       | Guest       | Free Account         | Monochrome Pass                                  |
| --------------------------------------------- | ----------- | -------------------- | ------------------------------------------------ |
| Discount on all products                      | —           | —                    | 10%                                              |
| Extra discount on bundles (Complete the Look) | —           | —                    | Extra 5%                                         |
| Points on purchases                           | —           | 1 point per Rs. 1200 | 2 points per Rs. 1200                            |
| Points expiry                                 | —           | 12 months            | Never expire                                     |
| Double points days                            | —           | —                    | 1 day every month                                |
| Member-only flash sale                        | —           | —                    | Once a month, 24 hours                           |
| Festival sales (Dashain, Tihar, New Year)     | Public sale | Early access         | Early access + extra member discount             |
| Price lock during sales                       | —           | —                    | Sale price held for 24 hours after the sale ends |

### New collections and stock

| Benefit                                   | Guest | Free Account   | Monochrome Pass          |
| ----------------------------------------- | ----- | -------------- | ------------------------ |
| Early access to new drops                 | —     | 12 hours early | 48 hours early           |
| Member-only products and limited editions | —     | —              | ✓                        |
| Pre-order upcoming pieces                 | —     | —              | ✓ before public listing  |
| Back-in-stock alerts                      | —     | ✓              | ✓ item held for 24 hours |
| Reserve items before buying               | —     | —              | Up to 3 items for 3 days |
| Vote on the next collection               | —     | —              | ✓                        |

**Rules for limited editions**

- Members only; the product page shows "Monochrome Pass exclusive" and a Join button to others.
- Maximum 1–2 per member per edition, so more members get one.
- Every piece is numbered (e.g. "No. 12 of 50") and comes with a card.
- Never restocked; show "Sold out — never returning" when gone.
- Announce to members 3 days ahead by WhatsApp and email.
- Implementation: a `members_only` flag, a `per_customer_limit`, a fixed `edition_size`, and an edition number assigned in order sequence.

### Gifts and occasions

| Benefit                     | Guest   | Free Account | Monochrome Pass                             |
| --------------------------- | ------- | ------------ | ------------------------------------------- |
| Gift wrapping               | Rs. 150 | Rs. 100      | Free                                        |
| Birthday reward             | —       | 5% coupon    | Small gift + 15% off for the birthday month |
| Membership anniversary gift | —       | —            | ✓ every year                                |

### Service, styling and returns

| Benefit                         | Guest                  | Free Account           | Monochrome Pass     |
| ------------------------------- | ---------------------- | ---------------------- | ------------------- |
| Customer support                | Normal                 | Normal                 | Priority line       |
| Return window                   | 7 days                 | 7 days                 | 15 days             |
| Return pickup                   | Customer pays          | Customer pays          | Free pickup         |
| Clothing size exchange          | Customer pays delivery | Customer pays delivery | Free with pickup    |
| Order Exchange or Replacement   | ✓                      | ✓                      | ✓ sent the same day |
| Order history and quick reorder | —                      | ✓                      | ✓                   |
| Favourites                      | —                      | ✓                      | ✓                   |

### Community and account

| Benefit                                                                                         | Guest | Free Account                                          | Monochrome Pass                                                              |
| ----------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| Refer a friend (one-time referral code; reward paid when the friend's first order is delivered) | —     | Rs. 200 credit to you after your friend's first order | Rs. 300 credit to you + your friend gets 1 month of the Monochrome Pass free |
| Pause membership                                                                                | —     | —                                                     | Up to 1 month a year                                                         |

## Website copy

Ready-to-paste text for the Membership page, checkout and banners. There are two checkout modes: Guest Checkout, and MONO Member login (the free account). The Monochrome Pass is bought only inside the MONO Member account. Each level lists only its headline benefits; link to the full tables for the rest.

### Mode 1: Guest Checkout

**Shop freely, no account needed.** Browse and buy without signing up. Pay with eSewa, Khalti or cash on delivery.

- Delivery Rs. 200, free above Rs. 4,000
- Ships within 48 hours
- 3-day returns and breakage replacement

_Log in or sign up as a MONO Member to save on delivery and get early access._

### Mode 2: MONO Member (free account)

**Your space in the Monochrome world.** Log in or sign up with your email. It is free.

- Delivery Rs. 150, free above Rs. 3,000
- Ships within 24 hours
- 12-hour early access to new drops and festival sales
- 1 point for every Rs. 100, plus a 5% birthday coupon
- 7-day returns, wishlist and one-tap reorder
- Refer a friend with your code: get Rs. 200 credit when their first order is delivered

_Inside your account, upgrade to the Monochrome Pass for free delivery, 10% off and 3-hour dispatch._

### Monochrome Pass (upgrade inside your MONO Member account)

**The full experience.** Rs. 999 for 6 months · Rs. 1,499 for a year.

Only logged-in MONO Members can buy the Pass. Guests see "Log in to get the Pass" on the membership page.

- Free delivery on every order, no minimum
- 3-Hour Dispatch on your first 3 orders each month
- 10% off everything, extra 5% on complete looks
- 2 points per Rs. 100, never expiring, plus double points days
- 48-hour early access, member-only pieces and pre-orders
- Monthly member-only flash sale and a free gift on every 5th order
- Free gift wrapping and a personal gift shopper
- Birthday gift + 15% off, and an anniversary gift every year
- 15-day returns with free pickup, free size exchange
- Priority WhatsApp support and a quarterly room plan
- Add one family member, pause up to a month a year

_Small print: 3-Hour Dispatch applies to ready-stock items confirmed 9 AM–6 PM. Orders after 6 PM ship by 11 AM the next day. Excludes public holidays._

### Taglines and checkout lines

- Guest Checkout button: "Just browsing? Shop as a guest."
- MONO Member button: "Log in or sign up. Free to join."
- Pass banner: "Free delivery. 10% off. Ready in 3 hours."
- Checkout, non-member: "Members would save Rs. \[X\] on this order."
- Checkout, member: "You saved Rs. \[X\] with your Pass."
- Member account: "2 of 3 Express Dispatches left this month."

### Checkout and sign-in screens

Customers choose one of two modes at checkout: **Guest Checkout** or **MONO Member** (the free account). Only MONO Members can buy the Monochrome Pass. The layout follows the Nike checkout reference and the Virzeen bag page. The full spec with your screenshots is in the markdown file (virzeen-checkout-ux.md).

&#91;embedded content: checkout flow · 2 modes, 1 decision\]

Guests skip login and go straight to delivery. Members enter an email: a registered email logs in with a code or password, and a new email goes to the create-account screen. Both modes meet at the same Delivery step.

| Screen                                            | Copy                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bag page                                          | Button: "Checkout". Under the total: "Free delivery above Rs. 4,000. Members save more."                                                                                                                                                                                                                                                                 |
| Choice panel, title                               | "Choose how you would like to check out"                                                                                                                                                                                                                                                                                                                 |
| Choice panel, left                                | "Check out as a MONO Member and get free delivery on orders Rs. 3,000+" · "Use your MONO Member email to log in. New here? Joining is free." · Button: "Log in / Sign up"                                                                                                                                                                                |
| Choice panel, right                               | "Check out as a Guest" · "No account needed. You can create a free MONO Member profile after your order." · Button: "Guest Checkout"                                                                                                                                                                                                                     |
| Email step                                        | "Enter your email to log in or join MONO" · Field: Email · Button: "Continue"                                                                                                                                                                                                                                                                            |
| Registered email                                  | "Welcome back. We sent a 6-digit code to \[email\]." · Field: Code · Link: "Use password instead" · "Resend code in 30s" · Button: "Log in"                                                                                                                                                                                                              |
| Password option                                   | Field: Password (show or hide) · Links: "Email me a code instead", "Forgot password?" · Button: "Log in"                                                                                                                                                                                                                                                 |
| New email                                         | "Now let's make you a MONO Member." · "We've sent a code to \[email\]. Edit" · Fields: Code, First Name, Last Name, Shopping Preference, Date of Birth · Hint: "Get a MONO Member reward on your birthday." · Tick: "Email me about new drops and Member benefits." · Tick: "I agree to the Privacy Policy and Terms of Use." · Button: "Create Account" |
| Delivery                                          | "Delivery Options" · Tabs: "Ship", "Pick Up" · Toggle: "Home/Office" · Fields: Email, First Name, Last Name, Address, Phone Number · Link: "Enter address manually" · Button: "Save & Continue"                                                                                                                                                          |
| Order summary panel                               | "In Your Bag" · Subtotal, Delivery, Member discount, Total · "Arrives by \[date\]" · item name, colour, size, quantity                                                                                                                                                                                                                                   |
| Guest nudge (only when the saving is above Rs. 0) | "MONO Members save Rs. \[X\] on this order. Log in or sign up"                                                                                                                                                                                                                                                                                           |
| Pass offer (members only)                         | "Add the Monochrome Pass for Rs. 999. Free delivery and 10% off this order: you save Rs. \[X\] today." · Button: "Add Pass"                                                                                                                                                                                                                              |
| Payment                                           | "Payment" · "eSewa" · "Cash on delivery" (an order with the Pass in it is paid online)                                                                                                                                                                                                                                                                   |
| Guest confirmation                                | "Thank you, \[Name\]. Order #\[ID\] is confirmed. Create your free MONO Member profile in one tap to track it and earn points." · Button: "Create profile"                                                                                                                                                                                               |

## Store features beyond membership

These features sit alongside the membership and make the store feel different from general shops. The room preview is left for later (5–6 months out).

| Feature                  | What it does                                                                        | How to build it                                                     | Effort |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------ |
| Gift finder              | Pick occasion and budget, see ready gift sets                                       | Curated collections + a filter page                                 | Low    |
| Gift registry            | Couples and new homeowners list items; guests buy from a shared link; no duplicates | Registry page, share link, "purchased" flag per item, ship to owner | Medium |
| Limited monochrome drops | A small numbered collection each month with a countdown                             | Collection page, countdown timer, stock limit, member early access  | Low    |
| Black or White quiz      | 4 questions (wall, floor, light, style) suggest the black or white version          | Simple quiz form with rule-based results                            | Low    |
| Styling guides           | Short guides like "Setting a Dashain dinner table" with products linked inside      | Blog pages                                                          | Low    |
| Breakage promise         | Broken on arrival → photo → replacement, no argument                                | Claim form + a clear policy line on every fragile product           | None   |

## Technical implementation

The membership runs on four pieces: customer accounts with a tier, a Pass purchase through eSewa, rules at checkout that read the tier, and a points-and-credit wallet. Build them in that order.

### 1. Accounts and tiers

- Sign-up and login with phone number (OTP by SMS) or email.
- Each customer record carries: `tier` (guest, free, pass), `pass_start`, `pass_end`, `points_balance`, `credit_balance`, `birthday`, `referral_code`, `family_member_id`.
- A daily job checks `pass_end`: send a renewal reminder 7 days before, and move the customer back to `free` when it expires.
- Pause: shift `pass_end` forward by the paused days (maximum 30 a year).

### 2. Selling the Pass

- Sell the Pass as a product ("Monochrome Pass – 6 months", "– 12 months") paid through eSewa ePay V2.
- On a verified payment (check the eSewa status API, never trust only the redirect), set `tier = pass` and the dates.
- Issue the Pass instantly; show a welcome screen listing the main benefits.
- Gifted or promotional Passes: an admin button that sets the tier and dates manually.

### 3. Checkout rules (read the tier on every order)

| Rule                    | Logic                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Delivery fee            | Guest Rs. 200 (0 above Rs. 4,000) · Free Rs. 150 (0 above Rs. 3,000) · Pass 0                                      |
| Member discount         | Pass: 10% off product subtotal; +5% on items in a bundle                                                           |
| Points earned           | Free: floor(total / 100) · Pass: floor(total / 100) × 2; double on the monthly double-points day                   |
| Points and credit spend | Let customers apply points (e.g. 100 points = Rs. 100) and credit at checkout                                      |
| 3-Hour Dispatch         | Pass: if `express_used_this_month` < 3 and the item is ready stock, tag the order EXPRESS and start a 3-hour timer |
| Gift wrap               | Price by tier; free for Pass                                                                                       |
| Savings line            | Calculate what a member would save and show it at checkout                                                         |
| 5th order gift          | Count Pass orders; on every 5th, add the gift item at Rs. 0                                                        |

### 4. Points and credit wallet

- Keep a ledger table: date, customer, type (earn, spend, expire, refund), amount, order or reason.
- Free Account points expire 12 months after they are earned; Pass points never expire.
- Credit sources: referrals, missed dispatch (Rs. 100), price drop refunds, photo reviews used in the gallery.
- Show balances and history in the customer's account page.

### 5. Feature logic

- **Dispatch timer:** order confirmed between 9 AM and 6 PM → deadline = confirmation + 3 hours; after 6 PM → deadline 11 AM next day. When the order is marked shipped after the deadline, add Rs. 100 credit automatically.
- **Early access:** each product has `public_launch_at`; Pass sees it 48 hours earlier, Free 12 hours earlier.
- **Member-only products:** a `members_only` flag hides the Add to Cart button for others and shows "Join the Pass to buy".
- **Reserve and price lock:** a reservation row (customer, product, price, expires\_at) that holds stock and price.
- **Price drop protection:** when a product's price falls, find Pass orders of it from the last 7 days and credit the difference.
- **Referrals:** each account gets one referral code. A friend can use a code only once, on their first order, and only as a new customer (new phone number). Nothing is paid for sign-ups or logins. When the friend's first order is delivered and not returned, credit the referrer: Rs. 200 for a Free Account, Rs. 300 for a Pass member, and for Pass referrals also give the friend 1 month of the Pass free.
- **Birthday and anniversary:** a daily job sends the coupon or adds the gift to the next order.

### 6. Admin tools you need

- Order list sorted by deadline, with EXPRESS orders at the top and a countdown.
- Customer search showing tier, points, credit and order history; buttons to add credit or extend a Pass.
- Coupon and bundle rule manager.
- Reports: Pass sales, renewals, express orders and misses, points issued vs spent.

### Platform choice

- **Custom build (e.g. Next.js or Laravel + a database):** full control over every rule above; needs a developer.
- **Ready platform (WooCommerce, Shopify):** faster start; tiers, points and bundles come from plugins or apps, and eSewa and Khalti plugins exist for WooCommerce. Some rules (3-Hour Dispatch timer, price drop protection) will still need custom code.

## Operations

The promises only work if the packing table can keep them. Set these routines before launch.

### Daily packing routine

1. Check the order list at 9 AM, 12 PM, 3 PM and 5:30 PM.
2. Pack EXPRESS (Pass) orders first, then by deadline.
3. Keep the top 10 best sellers pre-packed and labelled.
4. Hand over to the rider or courier and mark "shipped" with the time; this stops the dispatch timer.
5. Send the customer an SMS or WhatsApp with the tracking link.

### Packaging

- Fragile items (vases, glass): double box, padding on all sides, a "fragile" label. Take a photo of each fragile parcel before sealing as proof.
- Monochrome branded packaging for every order; black tissue and a card for gift orders.
- Keep gift wrap, note cards and gift items ready at the packing table.

### Returns, exchanges and breakage

- Return request through the account page or WhatsApp; ask for the order number and a photo.
- Breakage: approve within 2 hours of the photo; ship the replacement the same day for Pass members, next day for others.
- Pass returns and size exchanges: book a free pickup; refund to eSewa or Khalti, or as credit, once the item is checked.
- Log every return reason in a sheet to spot weak products or weak packaging.

### Customer support

- One WhatsApp Business number with labels: Pass, Order issue, Styling, Business.
- Reply targets: Pass members within 1 hour, others within 4 hours, during working hours.
- Saved replies for common questions: delivery time, return steps, Pass benefits.
- Styling requests: reply with 3 product links and a short reason for each.

### Holidays and peak days

- Announce the dispatch pause before Dashain and Tihar holidays.
- Before festival sales, pack stock ahead and add a helper for the week.

## Costs and pricing math

The Pass pays off only if members order more often than they would without it. The 10% discount is the biggest cost, so check it against your real margin first.

### Example: one yearly Pass member

Assumptions (replace with your own): 6 orders a year, Rs. 3,000 average order, 40% gross margin, Rs. 150 actual courier cost per order.

| Item                               | Amount (Rs.) |
| ---------------------------------- | ------------ |
| Member spend in a year (6 × 3,000) | 18,000       |
| Gross margin at 40%                | +7,200       |
| Pass fee                           | +1,499       |
| 10% member discount                | −1,800       |
| Free delivery (6 × 150)            | −900         |
| Points at 2%                       | −360         |
| 5th order gift (1 a year)          | −300         |
| Gift wrap, express delivery, misc. | −400         |
| **Profit from this member**        | **4,939**    |

The same customer as a Free Account buying 2 orders a year brings about Rs. 2,400 in margin. So the Pass works once it lifts a customer from about 2 orders to 4 or more a year.

### Guardrails

- Keep the member discount at 10% or less unless your margin is above 50%.
- Exclude the member discount from items already on sale, or cap combined discounts at 20%.
- Limit costly perks: 3 express dispatches, 1 express delivery and 1 room plan per period, as in the tables.
- Price drop protection: credit only, never cash, and only for 7 days.
- Points: value 1 point = Rs. 1 and cap points use at 20% of an order.
- Referral credit only after the friend's order is delivered and not returned.
- Family member: same delivery address only, to stop Pass sharing.
- Review every 3 months: Pass sales, renewals, orders per member, discount cost as a share of sales.

## Launch roadmap and KPIs

&#91;embedded content: launch roadmap · 4 phases, 3 gates\]

Each phase starts only once the gate before it is passed. Launch the Pass together with a new collection, so it reads as an upgrade, not a new charge.

### KPIs to track monthly

| KPI                               | Target to aim for               |
| --------------------------------- | ------------------------------- |
| Guest-to-account sign-up rate     | 20% of buyers create an account |
| Account-to-Pass upgrade rate      | 10% of active accounts          |
| Pass renewal rate                 | 60% or more                     |
| Orders per Pass member per year   | 4 or more                       |
| 3-Hour Dispatch on time           | 95% or more                     |
| Return rate                       | Under 5% of orders              |
| Breakage claims                   | Under 2% of fragile orders      |
| Discount cost as a share of sales | Under 10%                       |
| Average order value               | Rising month on month           |

Targets are starting points for a new store; adjust them after the first 3 months of real data.
