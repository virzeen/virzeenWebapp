---
paths:
  - "apps/web/src/client/**"
  - "apps/web/src/app/**/*.tsx"
---

# UI rules — summary. Full rules: docs/ui/ui-discipline.md (and its §0 map)

Before writing UI:

1. Storybook MCP: `list-all-documentation`, then `get-documentation` for each component you'll use. Never invent props.
2. Check `docs/ui/components-catalog.md` for which component fits, and `docs/ui/patterns.md` + `docs/examples/` for the page/form/list shape.

While writing UI:

- Tokens only (`docs/ui/design-tokens.md`): no hex, no arbitrary values except `aspect-[]`/`grid-cols-[]`/`grid-rows-[]`, no inline styles, no `text-sm`/`text-2xl` defaults.
- Server Components by default; `"use client"` only on small interactive leaves, never on page/layout.
- Client code may import only Server Actions from `@/server/actions/*` — nothing else from server, core, or db.
- Mutations: `startTransition` or `<form action>`, visible pending state, handle `{ ok: false }` with copy from `docs/ui/content-style.md`.
- Forms: React Hook Form + `zodResolver` with the schema from `@virzeen/validators`; every input in `FormField` with a visible label and correct `autoComplete`/`inputMode`.
- Every view: loading skeleton, `EmptyState`, error with retry.
- Money: `<Price paisa>`. Images: `<CloudImage alt>`. Keys: stable ids.

After writing UI: `node scripts/check-ui.mjs --changed`, then the `verify-ui` skill.
