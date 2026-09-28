# Conventions

## Naming

| Thing                | Convention                            | Example                               |
| -------------------- | ------------------------------------- | ------------------------------------- |
| Files & folders      | kebab-case                            | `product-card.tsx`, `order-state.ts`  |
| React components     | PascalCase export                     | `export function ProductCard()`       |
| Functions, variables | camelCase, verb-first for functions   | `calculateTotals`, `getProductBySlug` |
| Server actions       | verb + noun + `Action`                | `addToCartAction`                     |
| Core services        | noun + `.service.ts`, exported object | `cartService.addItem()`               |
| Zod schemas          | noun + `Schema`, type via `z.infer`   | `addToCartSchema`, `AddToCartInput`   |
| Prisma models        | PascalCase singular                   | `Product`, `OrderItem`                |
| Enums & values       | PascalCase / SCREAMING_SNAKE          | `OrderStatus.CONFIRMED`               |
| Money fields         | suffix `Paisa`                        | `unitPricePaisa`                      |
| Booleans             | `is/has/can` prefix                   | `isActive`, `hasStock`                |
| Env vars             | SCREAMING_SNAKE                       | `KHALTI_SECRET_KEY`                   |
| Test ids             | kebab-case                            | `data-testid="add-to-cart"`           |

## Code style

- TypeScript strict. No `any`, no `@ts-ignore` (use `@ts-expect-error` with a reason, only if unavoidable).
- Named exports everywhere except files Next.js requires to default-export (`page.tsx`, `layout.tsx`, etc.).
- Import via workspace aliases: `@virzeen/core`, `@virzeen/db`, `@virzeen/ui`, `@virzeen/validators`, and `@/` inside `apps/web/src`.
- No barrel files inside apps. Each package has one `src/index.ts` public entry.
- One component per file. Files over ~200 lines get split.
- Comments explain _why_, not _what_.
- No `console.log` in committed code. Use the logger on the server.

## Folder placement (decision guide)

- Used by one feature's UI only → `apps/web/src/client/features/<feature>/`
- Used by several features' UI → `apps/web/src/client/components/shared/`
- A styled building block with no business meaning (button, input) → `packages/ui`
- Any rule about money, stock, orders, users → `packages/core`
- Any input shape → `packages/validators`
- Repo tooling scripts (checks, generators) → `scripts/`

## Git workflow

- `main` = production. Protected: PR required, CI must pass, no force push.
- Branches: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>`.
- Branches live 1–3 days. Small PRs (under ~400 changed lines when possible).
- Commits: Conventional Commits with scope.
  - `feat(cart): merge guest cart on login`
  - `fix(payments): reject khalti lookup with amount mismatch`
  - `docs(ui): add toast usage rules`
  - `chore(ci): cache turbo outputs`
- PR description: what, why, link to spec, screenshots for UI, and the definition-of-done checklist.
