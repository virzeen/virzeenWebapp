# Spec: Top notice bar (Nike-style utility bar)

**Status:** Built (not yet reviewed in a PR)
**Owner approval:** owner, 2026-11-14 ("yes … join Monochrome Pass … they need to be MONO Member first")
**Related docs:** ui/design-tokens.md, ui/patterns.md, ui/content-style.md, specs/membership-portal.md, security/security-policy.md (admin writes audited)

## Goal

A thin black bar at the very top of every shop page, white text, like the bar above Nike's header. It shows one short notice at a time with a link ("Enjoy free delivery. Join MONO Member"). The owners add, order and switch off notices in `/admin`, with no deploy.

## User flow

1. A visitor opens any shop page. Above the header there is a black bar, 36px tall (`h-topbar` token), one line (two on phones for a visitor, see 5), white 12px/medium text, centred.
2. With several notices the bar shows one; it changes by sliding sideways every 5 seconds (pauses on hover/focus, stops under `prefers-reduced-motion`). Small round arrows (desktop) and swipe (phone) move it manually, like Nike's.
3. The notice is text + an optional underlined link. Each notice says who sees it: visitors (GUEST), MONO Members (MEMBER), Pass members (PASS), any mix.
4. The bar is part of the page, not sticky, like Nike's: it scrolls away and the header stays (and slides away on the shop listing as before). Over the home hero the bar is still black above the transparent header.
5. From md the bar's right corner holds the profile like Nike's: signed in "Hi, {name}" ("Hi there" while the account has no name, owner 2026-11-16) + icon with the hover menu (same greeting as its title, then Profile, Orders, Favourites, Account settings, Sign out; choosing a link closes it, owner 2026-11-16, and it opens again when the pointer or keyboard returns to the icon); signed out "Sign in" + icon. The profile icon left the main header row. Phones keep the account in the menu; a signed-out visitor gets "Join Now | Sign In" on a first line on phones, with the notice and its link on the line below (owner 2026-11-16), so the bar is 68px tall there; signed in it stays one line.
6. An admin opens `/admin/notices`: form above a list; each row has up/down, Edit and Delete (two taps). Fields: text, link words, link address, Starts on / Ends on (Nepal days), who sees it, Active. Saves, moves and deletes are audited.

## Default notices (shown when no written notice is active for that visitor's level)

The Pass is bought only inside a member account, so visitors are asked to become a MONO Member first (owner, 2026-11-14):

- Visitor: "Enjoy free delivery. **Join MONO Member**" → `/signup` (goes to sign-in/join).
- MONO Member: "Enjoy free delivery. **Join Monochrome Pass**" → `/account/membership`.
- Pass member: "Your Pass: free delivery and 10% off every order. **See your benefits**" → `/account/membership`.

Written notices replace the default for the levels they target.

## Acceptance criteria

- [x] Given no notices in the database, the bar shows the default for the visitor's level on every `(site)` page (not admin or the sign-in pages).
- [x] Given an admin adds a notice, when saved, it shows on the shop within the revalidate (`revalidatePath` on the layout).
- [x] A notice outside its Starts/Ends window, switched off or with the wrong audience is never rendered.
- [x] Link URL is a site path (`/…`) or `https://`; anything else is rejected by the validator (no `javascript:`).
- [x] The bar rotates every 5 s, pauses on hover/focus, has Prev/Next buttons with `aria-label`, announces with `aria-live="off"` while auto-rotating and `polite` on manual change; no rotation with reduced motion.
- [x] Bar and header slide away and back together; no layout jump; no horizontal scroll at 360/768/1280.
- [x] Text 12px+ with 4.5:1 contrast (white on ink), 44px touch target on arrows (hit area, not visual).
- [x] Admin writes (create, edit, reorder, toggle, delete) are audited and require admin + step-up.

## Out of scope

- Timers/countdowns, per-page targeting, scheduling by timezone, translations (Nepali) — later.
- Cookie-based dismiss (Nike has none).

## UI

- Screens: `(site)` layout (above `SiteHeader`), `/admin/notices`.
- Primitives: a new `TopBar`/`NoticeCarousel` feature component in `client/features/notices` (client leaf for rotation only); admin list reuses existing admin table/form patterns. Storybook MCP checked before build; a primitive variant + story if no existing one fits.
- Tokens: no new token; `h-9` (36px), `text-caption`, `tone-inverse` (white on the ink black). The bar is not sticky, so the header keeps `top-0`.
- States: loading — bar renders from server data (no skeleton, zero height shift); empty — defaults; error — query failure falls back to defaults; admin list has `EmptyState`.

## Data & API

- Model `SiteNotice { id, text, linkLabel?, linkHref?, audiences CustomerTier[], startsAt?, endsAt?, isActive, sortOrder, createdAt, updatedAt }` (migration `20261114160000_site_notices`) — new migration (db-change skill); `@@index([isActive, sortOrder])`.
- Validators: `@virzeen/validators` `siteNoticeSchema` (strict, text ≤ 90 chars, href rule above).
- Core: `packages/core/src/notices/notice-service.ts` (list active for audience, CRUD, reorder) + audit entries.
- Server: `server/queries/notices.ts` (falls back to the defaults if the read fails; not cached yet), `server/actions/admin-notices.ts`.
- `/api/v1`: none (mobile reads the web).

## Edge cases

- Overlong text truncates with ellipsis on phones (never wraps to 2 lines).
- One active notice: no arrows, no rotation.
- Admin sets Ends in the past: shown as "Ended" in the list.
- Member state comes from the existing session read (memoised), so no extra query for guests.

## Tests

- Unit (done): core `notice.service.test.ts` (6: defaults, order, audience, dates/status, move/delete/audit, half link), validators `notices.test.ts` (7).
- Browser (done by hand, 360/768/1280 on :3200): 36px black bar, white 12px text, rotation, pause on hover, arrows, scroll away, no console errors or sideways scroll.
- E2E (not written): admin adds a notice → visible on the shop.
