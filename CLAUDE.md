# Virzeen — Agent Operating Manual

Virzeen is a brand portfolio + e-commerce platform (Nepal first, cross-border later).
Monorepo: Next.js (App Router) + TypeScript + Tailwind v4 + Prisma + PostgreSQL, hosted on Railway.
Payments: eSewa, Khalti, Cash on Delivery. Mobile: Capacitor shell around the web app.

## 1. The golden rule

**The docs in `docs/` are the source of truth. You do not guess.**

- Before changing anything, read the docs the routing table (§3) points to.
- If the docs don't answer a question that affects behavior, money, security, data, or visible UI: STOP and ask the owner.
- If code contradicts the docs, report the conflict and ask. Don't silently pick one.
- If the owner approves a decision the docs didn't cover, write it into the right doc in the same change.

## 2. Task protocol (every task, in order)

1. **Orient.** Read `docs/STATUS.md` (injected at session start). In a new session, also read `docs/project-brief.md` for business context and past decisions.
2. **Classify** the task with the routing table (§3). Read every doc for every matching row, fully.
3. **Spec.** Find `docs/specs/<feature>.md`. New behavior without a spec → draft one from `_TEMPLATE.md` and get approval first.
4. **Plan.** Make a todo list; each todo names its files and the doc section it follows. Order: validators → db → core → server → primitives → client → pages → tests → docs. For work touching 3+ files, show the plan and wait for "go".
5. **Discover before creating.** UI: Storybook MCP `list-all-documentation` → `get-documentation`. Logic: search `packages/core`. Patterns: open the matching file in `docs/examples/`. Library APIs: check the installed version (Context7 MCP or `node_modules` types).
6. **Implement** one todo at a time; mark done only when it compiles and its tests pass.
7. **Verify.** Checks from `docs/testing/testing-strategy.md`; UI changes → `verify-ui` skill.
8. **Definition of done.** Go through `docs/definition-of-done.md` and report each item.
9. **Record.** Update `docs/STATUS.md` and any doc whose rules changed. Conventional Commit on a feature branch.

Skills: `build-feature`, `ui-component`, `payment-change`, `db-change`, `verify-ui`, `fix-bug`.
Reviewers: `security-reviewer`, `ui-reviewer` agents.

## 3. Routing table

| If the task touches…                             | Read first                                                            | Skill            |
| ------------------------------------------------ | --------------------------------------------------------------------- | ---------------- |
| New feature / behavior change                    | `docs/specs/<feature>.md`, `docs/architecture.md`                     | `build-feature`  |
| Bug                                              | the docs for the area + `docs/ai/common-mistakes.md`                  | `fix-bug`        |
| Any page, component, styling, layout, motion     | `docs/ui/ui-discipline.md` (+ the UI docs its §0 map points to)       | `ui-component`   |
| Colors, type, spacing, radius, shadow, z-index   | `docs/ui/design-tokens.md`                                            | `ui-component`   |
| Choosing/creating a component                    | `docs/ui/components-catalog.md` + Storybook MCP                       | `ui-component`   |
| Page, form, list, drawer, checkout, admin layout | `docs/ui/patterns.md` + `docs/examples/`                              | `ui-component`   |
| Any user-facing text, errors, empty states       | `docs/ui/content-style.md`                                            | —                |
| Public pages, images, fonts, metadata, PWA       | `docs/ui/performance-seo.md`                                          | —                |
| Server actions, API routes, `packages/core`      | `docs/backend/backend-policies.md`, `docs/backend/api-contract.md`    | `build-feature`  |
| Payments, orders, stock, refunds, checkout       | `docs/payments/payment-policy.md`, `docs/security/security-policy.md` | `payment-change` |
| Prisma schema, migrations, queries               | `docs/database/data-rules.md`                                         | `db-change`      |
| Auth, sessions, admin, secrets, headers          | `docs/security/security-policy.md`                                    | —                |
| Tests                                            | `docs/testing/testing-strategy.md`                                    | —                |
| Naming, folders, imports, git                    | `docs/conventions.md`                                                 | —                |
| Unknown term                                     | `docs/glossary.md`                                                    | —                |

`.claude/rules/*.md` load automatically when you open matching files; they summarize, the docs above are complete.

## 4. UI essentials (always apply)

1. **Storybook first.** Query the Storybook MCP before using or creating any component. Never invent a prop or variant.
2. **Layers.** Tokens → primitives (`@virzeen/ui`) → feature components (`client/features`) → pages. Need a new look? Add a primitive variant + story; never override primitive styles from outside.
3. **Tokens only.** Colors, type, spacing, radius, shadow, motion, z-index from `design-tokens.md`. No hex, no arbitrary values (except `aspect-[]`, `grid-cols-[]`, `grid-rows-[]`), no inline visual styles, no Tailwind default type sizes.
4. **Server first.** Pages and most components are Server Components. `"use client"` only on small interactive leaves, never on `page.tsx`/`layout.tsx`.
5. **Every view has states:** loading (skeleton), empty (`EmptyState`), error (friendly + retry), success (toast/confirmation).
6. **Money** only via `<Price paisa>`. **Images** only via `<CloudImage>` with `alt`. **Copy** from `content-style.md`.
7. **Accessible by default:** real buttons/links, visible labels, focus ring, 44px touch targets, `aria-label` on icon buttons.
8. **Mobile first:** verify at 360, 768, 1280px with Playwright MCP. No horizontal scroll.
9. `scripts/check-ui.mjs` enforces most of this automatically. Fix what it reports; `ui-allow: <reason>` only with owner approval.

## 5. Non-negotiables

1. Prices, totals, shipping are calculated on the server from the database. Never trust client numbers.
2. Money is an integer in **paisa**. Never floats.
3. An order is PAID only after server-side provider verification and an exact amount match.
4. Order/payment status changes only through `packages/core/src/orders/order-state.ts`.
5. Entry points: authenticate → authorize → rate-limit → validate (Zod) → call core. No business logic in routes or components.
6. Never read, print, log, or commit `.env` files or secrets. No secrets in `NEXT_PUBLIC_` vars.
7. Client code imports from the server side **only Server Actions** (`@/server/actions/*`) — never `@/server/*` otherwise, `@virzeen/core`, or `@virzeen/db`. Server files start with `import "server-only"`.
8. Never edit an applied migration. Never reset or run destructive SQL against a non-local database.
9. Never commit to `main`, never `--no-verify`, never force-push.
10. No new dependency without a stated reason; prefer what's installed.

## 6. Working style (how to avoid mistakes)

- **One folder: this one.** Work only in the main `virzeenWebapp` folder (owner rule, 2026-09-29). Make branches here with `git switch -c feat/<name>`; never `git worktree add`, never a copy next to it (`vz-*`). The owner's dev server on http://localhost:3000 runs from this folder, so this is where they see your work. Before switching branches: `git status` must show no one else's uncommitted changes (ask if it does), and check for busy peer sessions first.
- **Read before you write.** Open a file and its neighbors before editing it. Edit surgically; don't rewrite whole files for small changes.
- **Stay in scope.** Change only what the task needs. Note other problems in your summary instead of fixing them uninvited.
- **Small steps.** One todo, one verification. Prefer several small commits over one large one.
- **No invented APIs.** Props from Storybook MCP; library APIs from the installed version; our functions from the code itself.
- **Evidence, not claims.** When you say something passes, show the command and its result.
- **Ask early.** Ambiguous requirement, missing doc, or conflicting rules → one clear question, then wait.
- **Learn.** If the owner corrects you, propose the doc/rule change that would have prevented it (add to `docs/ai/common-mistakes.md` Lessons log).

## 7. Commands

```bash
pnpm install                          # install all workspaces
pnpm dev                              # web app http://localhost:3000
pnpm storybook                        # Storybook + MCP http://localhost:6006
pnpm turbo run lint typecheck test    # full checks
node scripts/check-ui.mjs --changed   # UI guard on changed files
pnpm test:e2e                         # Playwright end-to-end
pnpm db:migrate                       # create + apply a local migration
pnpm db:studio                        # inspect local DB
pnpm db:reset:local                   # LOCAL ONLY: wipe + re-migrate + seed
```

## 8. Where things live

```
apps/web/src/app/       routes: pages (frontend) + api/ (backend)
apps/web/src/client/    FRONTEND ONLY: components, features, hooks
apps/web/src/server/    BACKEND ONLY: actions, queries, auth, security
packages/core/          ALL business logic
packages/db/            Prisma schema, migrations, client
packages/validators/    Zod schemas shared by client and server
packages/ui/            tokens + primitives + Storybook
docs/                   the rules · docs/examples/ canonical code
scripts/check-ui.mjs    automatic UI rule checks
```

## 9. Known traps (loaded every session)

@docs/ai/common-mistakes.md
