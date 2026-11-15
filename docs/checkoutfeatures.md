Virzeen: Checkout and Sign-in UX Spec

Date: 2026-11-11 · Owner: Harry · Status: ready to build

This spec covers what a customer sees from the bag page to the order confirmation. It has two checkout modes (Guest Checkout and MONO Member), an email-first sign-in, and a Nike-style delivery step with an order summary panel on the right. Screenshots are in images/. The layouts in screenshots 1 to 3 are the Nike reference; screenshot 0 is the current Virzeen bag page.

1. The two modes
   Guest Checkout MONO Member (free account)
   How to start Tap "Guest Checkout" Tap "Log in / Sign up", enter email
   Delivery fee Rs. 200, free above Rs. 4,000 Rs. 150, free above Rs. 3,000
   Dispatch Within 48 hours Within 24 hours
   Saved addresses and order history No Yes
   Points, birthday reward, early access No Yes
   Monochrome Pass Cannot buy Can add inside the account or at checkout
   After the order Offered a free profile in one tap Already logged in

Rule: the Monochrome Pass is only sold to logged-in MONO Members. Guests see "Log in to get the Pass".

2. Flow at a glance
   MONO Member
   Guest Checkout
   Yes
   No
   Bag page: tap Checkout
   Choice panel
   Enter email
   Delivery
   Email registered?
   Log in: 6-digit code orpassword
   Create account: code, name,birthday
   Payment
   Order review
   Order confirmed
   Customer opens the bag and taps Checkout.
   The choice panel asks: MONO Member or Guest.
   Guest goes straight to Delivery.
   Member enters an email. The site checks it:
   Registered: send a 6-digit code to that email (default), or let the customer type a password instead. Then continue to Delivery.
   Not registered: show "Now let's make you a MONO Member" with the code already sent to that email. Create the account, then continue to Delivery.
   Delivery, Payment and Order Review are three steps on one page, with the order summary always on the right.
   Confirmation. Guests are offered a free profile.

The bag stays intact through every step, including login.

3. Screens
   3.0 Bag page (the current Virzeen page)

Virzeen bag page

What works: clean layout, clear summary, one strong Checkout button, "Only 1 left" urgency.

Changes:

Free-delivery hint under the shipping row, only when it applies: "Add Rs. 1,200 more for free delivery." Hide it when delivery is already free.
Member line under the total, only when a member would save money: "MONO Members save Rs. [X] on this order." Hide it when X is 0 (for example the Rs. 4,500 bag above, where delivery is already free for everyone).
Stock hold: because the item shows "Only 1 left", hold it for 15 minutes once it is in the bag and show a small timer: "Held for you for 14:32".
Arrival estimate under the summary: "Arrives by [date]" (see 4.2 for how it is worked out).
Keep the quantity control, heart (wishlist) and trash icon as they are.
Mobile: make the Checkout button sticky at the bottom of the screen.

Copy: button "Checkout". Under the total: "Free delivery above Rs. 4,000. Members save more."

3.1 Choice panel

Checkout choice panel

Opens when Checkout is tapped (a full page on mobile, a centered panel on desktop). Two columns with a thin divider; one column on mobile with the Member option first.

Element Copy
Title Choose how you would like to check out
Left heading Check out as a MONO Member and get free delivery on orders Rs. 3,000+
Left text Use your MONO Member email to log in. New here? Joining is free.
Left button Log in / Sign up
Right heading Check out as a Guest
Right text No account needed. You can create a free MONO Member profile after your order.
Right button Guest Checkout

Notes:

The reference screen has separate Login and Sign Up buttons. Because the next step asks only for an email and works out which one applies, one button is simpler. If you prefer two buttons, both open the same email step.
A small list under the left button helps: early access to new drops, points on every order, birthday reward.
Logged-in customers never see this panel. They go straight to Delivery.
3.2 Email step (new screen)
┌──────────────────────────────────────────┐
│ Enter your email to log in or join MONO │
│ │
│ ┌────────────────────────────────────┐ │
│ │ Email* │ │
│ └────────────────────────────────────┘ │
│ │
│ By continuing you agree to the Privacy │
│ Policy and Terms of Use. │
│ [Continue]│
└──────────────────────────────────────────┘

On Continue the site calls the identify check and goes to 3.3 (registered) or 3.4 (new). Show a spinner on the button, not a full-page loader.

3.3 Log in (registered email)
┌──────────────────────────────────────────┐
│ Welcome back │
│ We sent a 6-digit code to a@mail.com │
│ Edit │
│ ┌────────────────────────────────────┐ │
│ │ Code* ⟳ │ │
│ └────────────────────────────────────┘ │
│ Resend code in 30s │
│ Use password instead │
│ [Log in] │
└──────────────────────────────────────────┘
The code is the default, so nobody has to remember a password.
"Use password instead" swaps the code field for a password field (show or hide toggle) with two links: "Email me a code instead" and "Forgot password?".
The code field auto-submits when 6 digits are entered, and supports one-tap autofill from the email or SMS keyboard suggestion.
"Edit" returns to the email step with the email kept.
3.4 Create account (new email)

Create MONO Member screen

Shown when the email is not registered. The code has already been sent to that email.

Field Rule
Code* 6 digits, proves the email. "Resend code in 30s"
First Name*, Last Name* Two fields side by side
Shopping Preference* Dropdown: Home, Clothing, Both
Date of Birth (Year, Month, Day) Optional in our version. Hint: "Get a MONO Member reward on your birthday."
Tick (pre-ticked) Email me about new drops and Member benefits.
Tick (required) I agree to the Privacy Policy and Terms of Use.
Button Create Account (disabled until valid)

Heading: "Now let's make you a MONO Member." Under it: "We've sent a code to [email]. Edit".

Two differences from the reference:

Make Date of Birth optional. The reference asks for it up front; asking less means fewer people leave at this screen. The birthday reward is the reason to fill it in.
After the account is created, take the customer straight back to Delivery with their bag intact. Do not send them to a profile page.
3.5 Delivery and order summary

Delivery step and order summary

This is the main checkout page for both modes. Left: three steps (Delivery Options, Payment, Order Review). Right: In Your Bag.

Delivery Options

Two big toggles: Ship and Pick Up. Hide Pick Up until you have a studio or partner pickup point.
Under them a small switch: Home/Office (replaces the reference's APO/FPO, which does not apply here).
Fields:
Field Notes
Email* Guests type it. Members see it prefilled and locked.
First Name*, Last Name* Prefilled for members
Address "Start typing address" search box, with a link "Enter address manually"
Manual address fields Province, District, Municipality, Ward no., Tole or street, Landmark
Phone Number* Shows +977. Accepts 10 digits starting 97 or 98. Numeric keyboard on mobile.
Delivery notes (optional) For example "Call at the gate"
Button Save & Continue (grey until the form is valid)
Members with saved addresses see them as selectable cards above the form, with "Add a new address".
Optional: "Share location pin" so the rider can find the place.

Payment and Order Review are collapsed and greyed until the step before is saved. A finished step collapses to a short summary with an Edit link.

3.6 Payment
Option Notes
eSewa Redirect to eSewa, return to the confirmation page. Verify the payment with eSewa's status check before confirming the order.
Cash on delivery Available for normal orders. Not available when the Monochrome Pass is in the bag (the Pass is paid online).
Khalti Add when you have a registered business and a Khalti merchant account.
3.7 Order review

Show the delivery address, payment method, items, and the final total. Button: Place Order. Below it: "You will receive a confirmation by email and SMS."

3.8 Confirmation
Heading: "Thank you, [Name]."
Text: "Order #[ID] is confirmed. We will ship it by [date]." Member orders with express dispatch show the 3-hour promise.
Tracking link by SMS and WhatsApp.
Guest only: a card: "Create your free MONO Member profile in one tap to track this order and earn points." Button: Create profile. It sends a code to the email already used. After the code, this order is attached to the new account. Name and address are kept; birthday can be added later. 4. Order summary panel ("In Your Bag")

Always visible on the right on desktop. On mobile it becomes a bar at the top: "In your bag (1) · Rs. 4,500 ⌄" that opens the full panel.

Row Guest MONO Member Member with Pass
Subtotal Items total Items total Items total
Delivery Rs. 200, free above Rs. 4,000 Rs. 150, free above Rs. 3,000 Free
Member discount none none 10% of items
Monochrome Pass none none Rs. 999 (6 months) or Rs. 1,499 (year), only if added in this order
Total sum sum sum

Below the rows: Arrives by [date], then each item with image, name, colour, size and quantity, and an Edit link to the bag.

Pass offer (members only). A slim card in the panel: "Add the Monochrome Pass for Rs. 999. Free delivery and 10% off this order: you save Rs. [X] today." Button: Add Pass. Adding it updates the panel at once; removing it puts the old lines back.

Worked example, Rs. 2,500 order:

    Total

Guest 2,500 + 200 delivery = Rs. 2,700
Member 2,500 + 150 delivery = Rs. 2,650
Member + Pass (6 months) 2,500 − 250 discount + 0 delivery + 999 Pass = Rs. 3,249 (saves Rs. 400 on this order)

Guest nudge: "MONO Members save Rs. [X] on this order. Log in or sign up". Show it only when X is above 0, where X = guest delivery fee minus member delivery fee.

Arrival date: the dispatch promise for the customer's tier plus delivery days: same day within your city, 2 to 4 days elsewhere. Show a range if unsure ("Nov 17 to 19").

5. UI style

Keep it simple and monochrome, matching the Virzeen site.

Item Rule
Colours White background, near-black text (#111), grey secondary text (
#6B6B6B), light grey borders (
#E5E5E5). Errors in red (
#C62828), success in green (
#1A7F37). No other colours.
Type The site's clean sans-serif for everything. The logo wordmark is the only display type. Page title 28px, section titles 20px, body 16px, small text 13px.
Buttons Black pill, white text, 56px high, full width of the column. Disabled: light grey with grey text. Loading: spinner replaces the label.
Inputs 56px high, 8px radius, 1px grey border, floating label, 2px black border on focus. Required fields marked with *.
Spacing 8px grid. Form column 520 to 560px wide. Page 1,100px max. 32px between sections.
Header Logo on the left, bag icon with count on the right, and a WhatsApp chat link and phone number top right. No menu links, so people stay in checkout.
Dividers One thin vertical divider on the choice panel, one thin line between checkout steps. No shadows or gradients.
Motion Short fades only (150 ms). Steps open and close smoothly.
Mobile One column. Order summary collapses into a top bar. Primary button sticks to the bottom. Inputs use the right keyboards: email, numeric for phone and code.
Accessibility Every field has a label, errors are read out, full keyboard use, 4.5:1 contrast, focus ring always visible. 6. UX upgrades beyond the reference
Email-first entry. One email field decides login or sign-up, so nobody has to choose correctly between two buttons.
Passwordless by default. A code by email, with a password as an option. Fewer forgotten-password problems.
Never lose the bag. The guest bag merges into the account after login. Keep entered form data when someone goes back.
Guest to member after the order, not before it. Guests finish faster, and the profile offer comes when they have just bought.
Prefill everything for members: name, email, phone, saved address, preferred payment.
Inline validation as the customer leaves a field, with a clear message ("Phone number must be 10 digits"). Do not clear the form on error.
Email typo help: if the email ends in "gmial.com" or "gmal.com", ask "Did you mean gmail.com?".
Savings made visible: the nudge for guests, the Pass offer for members, and "You saved Rs. [X]" for members at the end.
Honest delivery date shown from the first checkout screen, based on the customer's tier.
Stock hold timer for low-stock items.
Trust line under the Place Order button: "Break it on the way? We replace it." (breakage promise) and a link to the return policy.
Edit links everywhere: email, address, items, payment. 7. Edge cases
Situation What happens
Wrong code "That code is not right." After 5 wrong tries, ask for a new code.
Code expired (10 minutes) "That code expired." Show a "Send a new code" button.
Code not received "Resend code in 30s" counter, then a Resend button. Suggest checking spam.
Email typed wrong at sign-up "Edit" next to the email goes back, bag kept.
Guest uses an email that already has an account Show a soft banner: "You have a MONO account. Log in to get member prices." They can still continue as a guest.
Registered customer picks Guest Allowed. No prefill, no points.
Pass in the bag and payment is COD Cash on delivery is hidden. Message: "The Monochrome Pass is paid online."
Payment fails or is cancelled Return to the Payment step, bag and address kept, message "Payment was not completed."
Item sells out while in the bag Message on the bag page and again at checkout; the customer chooses another size or removes it.
Free-delivery threshold crossed or lost Delivery fee and the hint update immediately in the panel.
Member Pass expires during checkout Member rates apply as Free Account; show the change in the panel.
Bag emptied Redirect to the bag page with "Your bag is empty." 8. Sign-in and security rules
Codes are 6 digits, valid for 10 minutes, single use, and stored hashed. Allow 5 wrong tries per code.
Limit code sends to 5 per hour per email and per IP; limit the email check to 10 per minute per IP.
Telling the customer whether an email is registered is needed for the "log in or create" step. It is limited by the rate limits above.
A password is optional, at least 8 characters, and can be set later in the account page.
Sessions last 30 days by default. Use an httpOnly, secure cookie.
Send codes from a clear sender name ("Virzeen") and never put marketing in the code email.
Marketing email consent is a separate tick and is never required. 9. Build spec

Pages

Page Route
Bag /bag
Choice panel /checkout (shown only when logged out)
Email step, login, create account /checkout/signin (steps inside one page)
Delivery, Payment, Order review /checkout/delivery
Confirmation /order/[id]/confirmed

Endpoints

Endpoint Purpose
POST /api/auth/identify Body: email. Returns existing or new, and whether a password is set.
POST /api/auth/code/send Sends a login or sign-up code.
POST /api/auth/code/verify Returns a session (login) or a sign-up token (new email).
POST /api/auth/login-password Password login.
POST /api/auth/register Creates the account (name, preference, birthday, consents) using the sign-up token.
GET /api/checkout Bag, tier pricing, delivery date.
PUT /api/checkout/delivery Saves address and phone.
POST /api/checkout/pass Adds or removes the Pass (members only).
POST /api/checkout/pay Starts the eSewa payment or places a COD order.
POST /api/orders/[id]/claim After a guest order, verify the email by code and attach the order to the new profile.

Data

Table Main fields
customers id, email (unique), first_name, last_name, preference, birthday (optional), marketing_opt_in, terms_accepted_at, password_hash (optional), tier, pass_start, pass_end
login_codes email, code_hash, purpose, expires_at, attempts, used_at
addresses customer_id, province, district, municipality, ward, street, landmark, phone, is_default
carts session or customer id, items, stock_hold_until
orders id, customer_id (empty for guests), guest_email, delivery fields, tier_at_order, totals, payment_method, status

Analytics events: checkout_started, mode_selected (member or guest), email_submitted, code_sent, login_success, signup_success, delivery_saved, pass_added, payment_started, order_placed, guest_profile_created.

10. Build order
    Week 1: choice panel, Guest Checkout, delivery step, order summary panel with tier pricing, COD and eSewa.
    Week 2: email step, code login, create account, bag merge after login, saved addresses.
    Week 3: Pass offer in the summary (members only), password option, confirmation page with the guest profile offer.
    Week 4: polish: stock hold timer, email typo help, mobile summary bar, analytics, breakage promise line.

Test before launch: guest order, new member order, returning member by code, returning member by password, failed eSewa payment, and a bag that changes during checkout.
