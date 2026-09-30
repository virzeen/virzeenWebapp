# Spec: Mobile menu like Nike's

**Status:** Approved (2026-09-30)
**Owner approval:** owner, 2026-09-30. Motion (later the same day): "the menu doesn't need to slide from the right side, it need to come from the up like the apple.com". First asked for apple.com's menu, then sent Nike's mobile menu: "need to be like this the menu one… the favourites, the Orders, and the bag is the cart and the orders shows the order that they did, and help as well. This is better." Earlier in the same request: "just side of the menu bar there need to be the icon… Home, Shop, Portfolio, About… in the Shop there need to show the category… there won't be the account… there will be the Setting… and my Profile… make it the best design."
**Related docs:** `ui/patterns.md` (header, navigation) · `ui/components-catalog.md` (Sheet) · `ui/content-style.md` · `specs/favourites.md`

## Goal

On phones (below `md`) the menu works like Nike's: a panel drops down from the top over the whole screen, like apple.com's, with a greeting row, large links with chevrons, Shop opening its categories in a second panel, and a list of icon links (Favourites, Bag, Orders, Help) at the bottom. The header shows the icons beside the menu button.

## User flow

1. Phone → header: Virzeen wordmark (left) · Favourites heart, Bag, Menu (right).
2. Menu → a panel drops down from the top and covers the screen, its rows fading in one after another: an X at the top right; "Hi, {first name}" with a person icon and a chevron (signed in) or "Sign in" (guests); a line; large links Home, Shop ›, Portfolio, About; then small icon links Favourites, Bag, Orders, Settings (signed in), Help.
3. Shop › → the panel slides to Shop: "‹ All" back button at the top left, the heading "Shop", then large links All products and each category that has products.
4. A link opens its page and the menu closes; the X, Escape, a tap on the dimmed page or Back (Android) closes it.

## Acceptance criteria

Header (below `md`; `md` and up unchanged)

- [x] Wordmark on the left (home link); on the right, in this order: Favourites (heart), Bag, Menu. No account icon on phones (it's in the menu). Each is a 44px target.

Menu panel

- [x] `Sheet side="top"` (owner, later on 2026-09-30: "come from the up like the apple.com"): the whole screen, dropping down from the top (`animate-drop-down`, 350ms; closing `animate-lift-up`, 250ms); the page underneath can't scroll; the rows fade in and drop a little one after another (`stagger-rows`, 30ms apart). Was a right `Sheet` like Nike's. No visible title (the dialog is still named "Menu" for screen readers); a 44px X at the top right.
- [x] Greeting row (signed in): person icon, "Hi, {first name}" (the first word of the account name; "Hi there" when there's no name), chevron → `/account` (My profile). Guests: person icon, "Sign in", chevron → `/login`. A line under it.
- [x] Main list, large (Nike's ~24px medium, from the type tokens), each a full-width row at least 44px tall: Home (`/`), Shop (chevron, opens the Shop panel), Portfolio, About.
- [x] Icon list, small (Nike's ~16px medium) with 20px line icons, after a gap: Favourites (heart, `/favourites`), Bag (bag, `/cart`), Orders (box, `/account/orders`; guests are asked to sign in first by the page), Settings (gear, `/account/settings`, signed in only), Help (question mark in a circle, `/contact`).
- [x] Shop panel: slides in from the right over the main list (reduced motion: instant); top left "‹ All" (back to the main list, focus returns to "Shop"); heading "Shop"; large links All products (`/shop`) and the categories with published products (`/shop/{slug}`), in their order.
- [x] Links are `ink`; pressed/hover shows `ink-muted`; the current page has `aria-current="page"`.
- [x] Keyboard and screen readers: modal dialog named "Menu"; focus goes to the first item on open and to the Shop heading on entering Shop; Tab stays inside; Escape closes; focus returns to the menu button. Every link closes the menu on click.
- [x] Reduced motion: no slide animations. Nothing scrolls sideways at 320–767px; a long list scrolls inside the panel.
- [ ] The install-app button (PR #13, `InstallAppButton placement="menu"`) joins the main list as "Install the Virzeen app" (like Nike's "Download Nike App") when `main` is merged into this branch.

Account wording

- [x] The account area's heading and page title read "My profile" instead of "Account"; the desktop header's account icon is labelled "My profile" (guests: "Sign in").

## Out of scope

- Search, a desktop mega-menu, collections or a brand row ("Jordan") in the menu, store finder.

## UI

- `packages/ui` `Sheet` gains a way to hide its visible title bar while keeping the accessible title (the menu draws its own X), with a story.
- Copy (add to `content-style.md`): "Open menu", "Menu", "Close menu", "Hi, {name}", "Hi there", "Sign in", "Home", "Shop", "All", "All products", "Portfolio", "About", "Favourites", "Bag", "Orders", "Settings", "Help".

## Tests

- E2E (`@mobile`, Pixel 7): open the menu; see Home/Shop/Portfolio/About and Favourites/Bag/Orders/Help; guests see "Sign in"; open Shop, see All products and a category; open the category, land on `/shop/{slug}` with the menu closed.
- Storybook: the Sheet story without a visible title (named, closes).

## Decisions while building

- **Sheet `header`** (not a yes/no switch): a caller's own top row replaces the title bar and its close button, and stays in place while the list under it scrolls. The title is still there for screen readers, so the dialog stays named "Menu" (`components-catalog.md`, story `Sheet/CustomHeader`).
- **Menu rows are primitive variants**: `Link variant="menu"` (large) and `"menuSmall"` (icon rows), and `Button variant="menu"` for Shop ›, each with a story.
- **Sizes**: the main list is `text-h2` in medium weight (28px; the type scale has no 24px step, and `text-h3` is 20px: the larger step keeps the list big and bold like Nike's), rows 56px; the Shop heading is `text-h1` medium; the icon list is `text-body` medium, rows 44px. Side padding is the sheet's 24px.
- **Shop panel motion**: the main list is swapped for the Shop panel, which nudges in 16px from the right with a fade (new tokens `animate-nudge-in-right` / `-left`, `design-tokens.md` §5); back nudges the main list in from the left. 16px stays inside the gutter, so nothing scrolls sideways during it.
- **Focus on open** goes to the greeting row (the first item), not the X; after a tap it shows no focus ring, only after the keyboard.
- **Back (Android)**: any navigation while the menu is open, browser Back included, closes it. The menu doesn't add its own history entry (Next's router owns history, and an extra entry would race a link's navigation), so Back goes to the previous page and closes the menu, rather than only closing the menu. Ask the owner if Back should only close it.
- **Current page**: marked with `aria-current="page"` only (no underline), like Nike; the Shop button itself isn't marked, All products or the category inside is.
- **Bag** in the menu opens the bag page (`/cart`), not the drawer.
- **Greeting name**: the site layout passes `firstName(user.name)` (`nav-current.ts`): the first word, or "Hi there" when the account has no name (email sign-ups start without one).
- **Not changed**: the account nav landmark is still named "Account" for screen readers (only the heading, page title and header icon became "My profile").
