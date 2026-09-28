---
name: ui-component
description: How to build or change any Virzeen UI — primitives in packages/ui, feature components, and pages — using Storybook as the source of truth and design tokens only. Use this whenever the task involves a component, page layout, styling, Tailwind classes, animation, or Storybook, even for "small" visual tweaks.
---

# UI component workflow

Consistency is the product. This workflow keeps every screen on the same system.

## 1. Read the rules

Read `docs/ui/ui-discipline.md` fully, then the docs its §0 map points to for this task:
`design-tokens.md` (values), `components-catalog.md` (which component), `patterns.md` (page/form/list shapes), `content-style.md` (all text).
Open the matching file in `docs/examples/` and follow its shape.

## 2. Ask Storybook what exists

Make sure Storybook is running (`pnpm storybook`), then use the Storybook MCP:

- `list-all-documentation` → find existing components.
- `get-documentation` for each candidate → read real props, variants, and examples.
  Never assume a prop exists because it sounds common.

## 3. Decide the layer

- Generic, no business meaning (button, input, dialog, badge) → primitive in `packages/ui/src/primitives`.
- Business-aware (product card, cart drawer) → `apps/web/src/client/features/<feature>/`.
- Reused across features but business-aware → `apps/web/src/client/components/shared/`.

## 4. New or changed primitive

1. Build it with tokens only (no hex, no arbitrary values). Accessible by default (keyboard, focus, aria).
2. Write `<name>.stories.tsx` covering every variant, size, and state (default, hover, focus, disabled, loading, error).
3. Export from `packages/ui/src/index.ts`.
4. Check the Storybook a11y panel has no violations.
5. Re-query the Storybook MCP to confirm the new documentation appears.

## 5. Feature component or page

- Compose primitives; keep it a Server Component unless it needs interactivity.
- Include loading, empty, and error states.
- Money via `<Price paisa>`; images via `<CloudImage>` with alt text.

## 6. Verify

1. `node scripts/check-ui.mjs --changed` → zero problems.
2. Run the `verify-ui` skill (Playwright MCP) and fix everything it finds.
3. For larger UI changes, run the `ui-reviewer` agent on the diff.
4. Walk through the self-review checklist in `docs/ui/ui-discipline.md` §9.
