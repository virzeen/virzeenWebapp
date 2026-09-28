---
paths:
  - "packages/ui/**"
---

# Primitive rules — full rules: docs/ui/ui-discipline.md §2–4, docs/ui/design-tokens.md

- Primitives have NO business knowledge (no products, prices, orders). Business-aware → `apps/web/src/client/features`.
- Variants with `cva`, classes merged with `cn()`. Prefer adding a variant over creating a near-duplicate component.
- Every primitive change updates its `*.stories.tsx`: all variants, sizes, and states (default, hover, focus-visible, disabled, loading, error). Use `tags: ["autodocs"]`.
- JSDoc on the component explaining when to use it (the Storybook MCP surfaces it to agents).
- Accessible by default: correct element/role, keyboard support, `focus-visible:ring-focus`, 44px min touch size for interactive sizes.
- Token values change only in `src/tokens/tokens.css` AND `docs/ui/design-tokens.md` together.
- New primitive: component + story + export in `src/index.ts` + row in `docs/ui/components-catalog.md`, in one change.
- Canonical shape: `docs/examples/primitive-button.tsx` and `primitive-button.stories.tsx`.
