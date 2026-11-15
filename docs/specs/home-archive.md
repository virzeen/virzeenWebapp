# Spec: Home "Virzeen Archive's" section

**Status:** Built (browser-checked, not yet reviewed in a PR)
**Owner approval:** owner, 2026-11-15 ("in the landing page there need to be the spotlight as well, in a different name, same as this. Go for it now"). The name "Virzeen Archive's" (shown in capitals; owner, 2026-11-15) and the tile content (categories and collections) are my choices; the owner may rename.
**Related docs:** ui/ui-discipline.md, ui/content-style.md, specs/member-perks.md (early access)

## Goal

A section at the very end of the home page (just before the footer), like Nike's Spotlight: a big heading, one line, and a centred grid of icon tiles that each lead into the shop, so a visitor can jump to any category or collection.

## User flow

1. The visitor scrolls to the end of the home page, above the footer, and sees "VIRZEEN ARCHIVE'S", the line "Every category and collection, one tap away.", and tiles (a clipart icon above, the name below).
2. A tile opens `/shop/<category>` or `/collections/<collection>`.

## Acceptance criteria

- [x] Tiles are every shop category (with a published product) followed by every live collection, at most 16.
- [x] A tile has a small outline icon (our own set in `archive-icons.tsx`, 32px, one family), not a photo and no circle behind it (owner, 2026-11-15: "small", "ordinary icons", then "the current icons are not good", with a beaded bracelet as the Accessories icon); on hover its solid parts fill in and only the name fades to 70% (no lift; owner, 2026-11-15). Picked by words in the name (Home → house, Wear/Tops → tee, Bottoms → trousers, Accessories → beaded bracelet, Essentials → box, Sale/New → sparkle ...), else a tag for a category and a gem for a collection. A category or collection with nothing visible is left out.
- [x] 3 tiles a row on phones, 4 from sm, 6 from md, 8 from lg, centred in a 56rem column; no sideways scroll at 360/768/1280.
- [x] No tiles, no section. Heading is the page's `h2`; each tile is one link with the name as its text.
- [x] No admin work: tiles come from categories and collections the owners already manage.

## Out of scope

- Hand-picked tiles, own icons or pictures (Nike uses cut-out photos). Later, if wanted: an admin list like Notices.
- Horizontal scroller on phones.

## UI

`client/features/home/in-focus.tsx` (Server Component) using `Container`, `Link` and lucide icons. Tokens: `text-display` uppercase, `text-body-lg`, `text-body`; no new tokens or primitives.

## Data

`catalogReads.listHomeTiles(earlyHours)` in core (read-only, no schema change); `listHomeTiles()` in `server/queries/catalog.ts`.

## Tests

Browser at 360/768/1280. No unit test (a plain read; covered by typecheck).
