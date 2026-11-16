# Spec: Fill a size table from a picture

**Status:** Built (2026-11-16) on `feat/size-chart-from-picture`, pushed, not merged yet. First real try: a read timed out at 30 s on `gemini-3.8-flash` (key and free tier were accepted); `gemini-3.5-flash-lite` is the next thing to try. Step 0 (the model test below) has not been run: it needs the owner's key, so the feature is built and tested against a mock Google server and stays hidden until `GEMINI_API_KEY` is set. **Not yet verified against the real model.**
**Owner approval:** owner, 2026-11-16 ("Go for building it now"), after choosing the free Google Gemini tier ("option B") earlier the same day. The six decisions at the end were not answered one by one; the owner's "go" is taken as accepting the recommended answer to each (recorded in "Owner decisions").
**Related docs:** `specs/size-guides.md` · `specs/product-page-v2.md` ("Size guides") · `backend/backend-policies.md` §2–§4, §10 · `security/security-policy.md` §1, §4, §6, §9–§11 · `ui/content-style.md` · `runbooks/service-setup.md`

## Goal

On a Clothing size guide the admin drops in a supplier's size chart picture (Chinese or any language) and the size table fills in, in English and in cm, replacing what was there. The admin checks it against the picture and saves as usual. It saves typing a chart by hand.

## What differs from what was said in chat

In chat the server was described as reading the picture from our Cloudinary folder. This spec does not do that. The browser sends the picture's bytes straight to a Server Action, the server forwards them to Google and keeps nothing, and the server never fetches a URL. That follows `security-policy.md` §11 (never fetch user-supplied URLs on the server) and keeps these pictures out of Cloudinary's 25-credit budget.

## Facts checked on 2026-11-16 (Google's own pages)

- Pricing page: `gemini-3.8-flash` and `gemini-3.5-flash-lite` (Standard tab) show the **Free Tier** input and output as "Free of charge". The free tier's "Used to improve our products" is **Yes** (paid tier: No). The Gemini 4 models are not on the free tier.
- Rate limits are per Google project (not per key); requests per day reset at midnight Pacific time; the numbers are shown only in the owner's AI Studio (aistudio.google.com/rate-limit), not in the docs.
- Singapore (where Railway runs) and Nepal are both on the supported-regions list.
- Images can be sent inline in the request (up to 20 MB in all). Next.js caps a Server Action body at 1 MB (`next.config.ts` sets `bodySizeLimit: "1mb"`; the bundled docs confirm the default), so the picture must be small (see below). The limit is not raised: it covers every Server Action.
- Model names change. The model id is a Railway variable (`GEMINI_MODEL`), so a retired model is fixed without a code change.

## Step 0: the gate (before any code)

The owner makes a free key (Google AI Studio, "Create API key"), and we test on 3–5 real supplier charts, including this one (XS–L, Chinese headings, no unit stated). The test script reads the key from the process environment and prints only the table it read, never the key. Record here: the model id chosen (`gemini-3.8-flash` is the first to try, `gemini-3.5-flash-lite` the cheaper), whether every digit came back right, and any quota error.

**If a free model does not read the images with correct digits, we stop and go back to the owner** (typing by hand, or in-browser OCR). We do not spec around a failed test.

Result: _not run yet._

## User flow

1. Admin → Size guides → New or Edit, type Clothing. Next to "Start from a template" there is a button, "Fill from a picture".
2. The admin picks a picture. The browser shrinks it and shows it above the grid ("Your picture").
3. "Reading the picture…" for a few seconds.
4. The table fills in. If the admin had typed something, the same confirmation as pasting a whole table asks first ("Replace the table with the one from the picture?" Replace / Keep my table).
5. A notice under the grid says what to check (see UI). The admin fixes any box and presses Save. Nothing is saved by the reading itself.

## Acceptance criteria

Button and picture

- [ ] "Fill from a picture" shows in a Clothing guide's Size table only when `GEMINI_API_KEY` is set (a `pictureReadingEnabled` prop, like `uploadsEnabled`). It is not shown for Accessories guides.
- [ ] Only JPG, PNG and WebP are accepted. Anything else shows "Choose a JPG, PNG or WebP picture." and nothing is sent.
- [ ] The browser shrinks the picture to at most 1600 px on the long side and re-encodes it (WebP, JPEG where WebP is not available) until it is at most 900 KB. Unlike the photo shrinker, a small file is not skipped. If it cannot get under 900 KB: "That picture is too big. Try a smaller one."
- [ ] The picture stays on the admin's computer: it is shown from a `blob:` URL, never uploaded to Cloudinary, never stored, never put in the database.

Server

- [ ] `readSizeChartPictureAction(formData)` runs `runAdminAction` (sign-in, admin, fresh authenticator step-up, `admin` rate limit), then two new limits, then validates, then reads. A visitor or a customer gets the same refusal as every admin action.
- [ ] New limits in `rate-limit.ts` and `security-policy.md` §6: `admin:ai` 10 per 10 min per admin and `admin:ai-day` 40 per 24 h per admin. Over the limit gives `RATE_LIMITED`.
- [ ] Validation: exactly one file named `picture`, 1 byte to 950 KB, and its **real bytes** must be JPEG, PNG or WebP (magic numbers), whatever the browser called it. Failures return `VALIDATION_FAILED` before any call to Google. The limits live in `@virzeen/validators/limits` (no zod) so the browser and the server share them.
- [ ] The adapter (`server/services/gemini.ts`, `import "server-only"`, no SDK, plain `fetch`) calls only `https://generativelanguage.googleapis.com/v1beta/models/<GEMINI_MODEL>:generateContent`, sends the key in the `x-goog-api-key` header (never in the URL), the picture as inline base64, thinking set to low, structured JSON output (`generationConfig.responseFormat.text` with a JSON schema, the field Google's Gemini 3 docs use for `gemini-3.8-flash:generateContent`) and no `temperature` (Gemini 3.6 and later ignore it and warn it will become an error), and gives up after 30 seconds. The request shape comes from Google's docs and has not been run against Google yet (step 0).
- [ ] The picture's own words are data, never instructions: the fixed prompt says so, and the model's reply is accepted only as the schema's fields (strict Zod, extra fields refused). Nothing else from the reply reaches the page, and table cells are shown as input values (escaped by React).
- [ ] The reply's shape: `readable`, `unit` (`cm` | `in` | `unknown`), `multipleTables`, `columns` (English names), `rows` (`size` and one value per column), `skipped` (headings of columns not placed), `note` (the chart's own footnote in English, or empty).
- [ ] The prompt asks for English names from a fixed list where one fits (Chest, Shoulder, Sleeve, Length, Waist, Hip, Inseam, Thigh, Rise, Hem, Neck, Height) and a short English name otherwise; sizes as rows even if the picture has them as columns; the first table only when there are several.
- [ ] Core (`packages/core/src/catalog/size-chart-reading.ts`, pure, unit-tested) turns the reply into the result: names and sizes trimmed; `~`, `–` and "to" ranges written as `96-101`, a trailing "cm" removed; a value that is not a number or range is left blank and counted; more than 6 columns or 20 rows are cut and counted; the table must meet `sizeChartSchema`'s limits (a core test keeps them in step). Two measurements or sizes with the same name are kept: the grid says so on Save, as it does for typed ones.
- [ ] `readable: false` gives `VALIDATION_FAILED` "This doesn't look like a size chart. Try a clearer picture." `unit: "in"` (any column) gives `VALIDATION_FAILED` "This chart is in inches, but the table uses cm. Convert it first." Nothing is filled in either way.
- [ ] Google answering 429 (quota) gives `RATE_LIMITED` "Reading pictures is busy right now. Try again in a minute, or type the table." A 5xx, a timeout, a missing key, a retired model or a reply that is not valid JSON all give `INTERNAL` "Couldn't read the picture. Try again, or type the table." No new error code is added.
- [ ] Reading writes nothing, so it is not audited (`security-policy.md` §9 audits admin writes). The server logs one `info` line: admin id, ok or failed, milliseconds. It never logs the picture, the key, the cells or Google's raw reply, and nothing from the request body goes to Sentry.

Table and notice

- [ ] The result goes into the grid with the same code as a template or a pasted table: straight in when the table is blank, else after the "Replace the table…" confirmation. Cancelling ("Keep my table") changes nothing.
- [ ] After filling, a notice under the grid always says "Check every number against the picture before you save." It adds, when they apply: "Left out: Weight." (the `skipped` headings, up to 5, each cut to 30 characters); "The picture doesn't show a unit, so the numbers were read as cm." (unit `unknown`); "{n} value couldn't / values couldn't be read and was / were left blank."; "{n} measurement was / measurements were left out: the table holds up to 6." and "{n} size was / sizes were left out: the table holds up to 20."; "The picture has more than one table. Only the first was read."
- [ ] Fit tips: if the Fit tips box is empty and the reply has a `note`, the note is put there (up to 500 characters) and the notice says "Added the picture's note to Fit tips." If Fit tips already has text it is left alone. (Owner decision 4.)
- [ ] The grid, the editor's save, the live customer preview and the inches switch work on the filled table exactly as on a typed one. Columns are never added that the grid cannot hold.

Config and docs (same change)

- [ ] `GEMINI_API_KEY` and `GEMINI_MODEL` are optional in `env-schema.ts`, `.env.example` and `runbooks/service-setup.md` (key made in AI Studio, kept only in Railway and `.env.local`, restricted to the Generative Language API, owned by an account with two-factor). An optional `GEMINI_API_URL` exists only so tests can point at a mock; `env-schema.ts` refuses any value other than Google's on a production build with a real domain (the sandbox-default rule in `ai/common-mistakes.md`).
- [ ] `security-policy.md`: §6 table (the two limits), §4 (pictures for reading are never stored and never fetched), §10 (the Google account that owns the key is on the two-factor list), §11 SSRF line (the only outside host is fixed). `content-style.md` gets the copy below. `specs/size-guides.md` links here.

## Out of scope

- Accessories guides (they show a picture, no table), product photos, many pictures at once, converting inches to cm, keeping the supplier's picture, reading anything but size charts.
- A fallback reader (in-browser OCR) and any paid plan. If the free quota ends, the button shows the friendly error and typing and pasting still work.

## UI

- Screens: `/admin/size-guides/new` and `/admin/size-guides/{id}`, the "Size table" section only.
- Primitives (Storybook MCP is checked at build time, no prop is assumed): `Button` (secondary, `sm`, pill, with a loading state), `Alert`, `Dialog` (to open the picture larger), `toast`, and the existing replace dialog (`size-chart-replace-dialog.tsx`). One new client component, `SizeChartPictureReader`, beside the template button.
- The picture sits in a panel above the grid (up to 20rem high, fitted, "Remove picture" button, tap to open larger). A plain `<img>` with a `blob:` URL is needed because `CloudImage` is for Cloudinary pictures. `scripts/check-ui.mjs` flags raw `<img>`, so this needs a `ui-allow: local preview of a picture that is never uploaded` and the owner's approval (decision 5). The picture has alt text "Size chart picture you chose".
- States. Loading: the button is disabled and loading, the panel says "Reading the picture…" (announced politely). Error: an `Alert` with the copy below and a "Try again" button that keeps the picture; the table is untouched. Success: toast "Table filled in from the picture" and the notice. Empty: no picture, only the button and its helper.
- Changed after the owner's request (2026-11-16, "no need to write the description, just Ctrl+V or drag"): the area is centered, and its only text is the button "Fill from a picture" and the hint "Ctrl+V to paste, or drop a picture here". A picture on the clipboard (a screenshot, "Copy image") is read straight away from anywhere on the page, but never when the clipboard also holds text, so cells copied from Excel or Google Sheets still go to the table's own paste. Dropping a file or choosing one works as before. The note that the picture is sent to Google, not stored, and that only size charts should be sent is no longer on screen (it stays in `security-policy.md` §4 and `runbooks/service-setup.md`); decision 2 below is now the owner's to keep in mind rather than the admins' to read.
- Copy: Messages are the quoted ones in the criteria. Every line goes into `content-style.md` first.
- Checked at 360, 768 and 1280 px (Playwright on port 3200); the panel and notice must not cause sideways scrolling.

## Data & API

- Models touched: none. No migration. Nothing is stored.
- Validators: picture limits and types in `packages/validators/src/limits.ts`; a strict schema for the model's reply in `packages/validators/src/catalog.ts`.
- Core: `size-chart-reading.ts` (`interpretChartReading`), exported from `packages/core`.
- Server: `server/services/gemini.ts`, `server/actions/admin/size-chart-reading.ts`, two `LIMITS` entries, env.
- `/api/v1`: no change (admin only; `api-contract.md` untouched).

## Edge cases

- A chart with the unit not stated (this picture): read as cm, with the notice.
- A chart with sizes across the top and measurements down the side: transposed so sizes are rows.
- Two tables in one picture (men and women): the first only, with the notice.
- Hidden instructions written in the picture: only the schema's fields get through; the notice never prints free model text except `skipped` headings, which are escaped and cut to 30 characters.
- A skewed, blurry or tiny picture: the admin's check against the picture is the safety net; if the model reports `readable: false` nothing is filled.
- Two columns that read to the same English name: the grid's existing "Another measurement has the same name" message shows on Save.
- Two admins at once: both use the same Google project's quota; the daily cap keeps one from using it all.
- Google retires the model or the key is rotated: the friendly error shows; the fix is a Railway variable.
- Double click: the button is disabled while reading; reading changes nothing, so a repeat is harmless.

## Tests

- Unit (core): `interpretChartReading` — normal chart; `~`/`–`/"to" ranges; "106cm"; a text value left blank and counted; ragged rows; more than 6 columns and 20 rows; `readable: false`; inches; unit unknown; duplicate names; `skipped` limits.
- Unit (web): the adapter against a mocked `fetch` (the only thing mocked is the outside provider): fixed host, key in the header and not the URL, base64 body, 429, 5xx, timeout and bad JSON each map to the right code; the magic-bytes check (a renamed `.exe`/PDF is refused; a JPEG called `.png` passes); the action refuses a visitor, a customer and an admin without step-up, enforces both limits, and refuses an oversize or wrong-type file before any outside call; the browser shrinker ends at most 900 KB and 1600 px and does not skip a small file; env-schema refuses a non-Google `GEMINI_API_URL` on a live domain.
- E2E (production build with a mock Gemini server, like the mock eSewa/Khalti): admin picks a small synthetic chart picture, the grid fills with English names, the notice lists "Left out: Weight", typing something first triggers the replace dialog and "Keep my table" changes nothing, Save works, the product page shows the table in cm and inches; a mock 429 shows the busy message and leaves the table alone; with no key the button is not there.
- Visual: `verify-ui` at 360, 768 and 1280 px; security review inline with `docs/reviews/security-review.md`.

## Owner decisions

The owner said "Go for building it now" (2026-11-16) without answering these one by one, so the recommended answer to each was built. Say if any should change; each is a small edit.

1. **Which Google account owns the key.** Recommended: the business account that already owns the "Virzeen" Google Cloud project, with two-factor on, and the key restricted to the Generative Language API (`security-policy.md` §10).
2. **The free tier's terms.** Google may use what is sent to improve its products, and its reviewers may read it. These are supplier charts, not customer data, so the privacy policy needs no change. The helper text tells the admins to send only size charts. OK?
3. **Charts in inches.** Recommended: refuse with a message (no guessing at conversions). The alternative is to convert to cm, which changes the data.
4. **The chart's own footnote** (for example "measured flat by hand, allow 1–2 cm difference"). Recommended: put the English version in Fit tips, only when that box is empty, visible and editable before saving. The alternative is never to fill Fit tips.
5. **A plain `<img>` for the local preview** with `ui-allow` (the checker forbids raw `<img>`). The alternative is no picture beside the table, which defeats the check.
6. **The daily limit** (40 readings a day per admin) and **when to build it**. Suggested slot: the end of week 4 (before launch prep starts on 12-07), since it saves the most time while real products are being entered.

## Plan (in this order)

0. Step 0 above (owner's key, model test); stop if it fails. Result written into this spec.
1. Validators: picture limits (`limits.ts`), reply schema (`catalog.ts`), tests. Follows backend-policies §4.
2. Core: `size-chart-reading.ts` + unit tests.
3. Server: env (`env-schema.ts`, `.env.example`, `service-setup.md`), `LIMITS`, `services/gemini.ts`, the action, tests. Follows backend-policies §2 and security-policy §4, §6, §11.
4. Client: reading shrinker, `SizeChartPictureReader`, picture panel and notice, `pictureReadingEnabled` from the two size-guide pages. Follows patterns.md and ui-discipline.md.
5. E2E with the mock Gemini server.
6. Docs: security-policy, content-style, size-guides spec, STATUS.md.
7. Checks from `testing-strategy.md`, `verify-ui`, security review, then `definition-of-done.md`.
