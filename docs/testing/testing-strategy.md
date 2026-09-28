# Testing Strategy

## 1. Layers

| Layer                    | Tool                            | Location                       | What                                                                         |
| ------------------------ | ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Unit                     | Vitest                          | next to code: `*.test.ts`      | pure logic: pricing, state machine, signatures, validators, formatters       |
| Integration              | Vitest + test Postgres          | next to code: `*.test.ts`      | `packages/core` services that use the database (e.g. `cart.service.test.ts`) |
| Component                | Storybook + Vitest addon + a11y | `packages/ui/**/*.stories.tsx` | every primitive's variants and states                                        |
| End-to-end               | Playwright                      | `apps/web/tests/e2e/*.spec.ts` | critical user journeys in a real browser                                     |
| Exploratory verification | Playwright MCP (agent)          | —                              | agent checks UI changes visually before finishing (`verify-ui` skill)        |

Playwright MCP is for the agent to look and click; it does not replace written e2e tests.

## 2. What must be tested

- `packages/core`: every service function; target ≥ 90% line coverage for `payments/`, `orders/`, `pricing/`, `inventory/`.
- Every bug fix starts with a failing test that reproduces it.
- Critical e2e journeys (must always pass before merge):
  1. Browse → product page → add to cart → cart updates
  2. Guest cart → login → cart merged
  3. Checkout with COD → order confirmation → order visible in account
  4. Checkout with eSewa (provider mocked) → success callback → order PAID
  5. Checkout with Khalti (provider mocked) → lookup Completed → order PAID
  6. Admin creates a product → visible on shop
  7. Non-admin cannot open `/admin`

## 3. When checks run

| Moment                | What runs                                                        | Enforced by                    |
| --------------------- | ---------------------------------------------------------------- | ------------------------------ |
| Agent edits a file    | prettier + eslint + UI guard on that file                        | `.claude/hooks/format-file.sh` |
| Agent finishes a task | UI guard + typecheck + lint + tests (affected) + STATUS.md check | `.claude/hooks/stop-verify.sh` |
| `git commit`          | lint-staged + UI guard + typecheck (affected) + gitleaks         | `.husky/pre-commit`            |
| `git push`            | unit tests (affected) + e2e                                      | `.husky/pre-push`              |
| Pull request          | everything above + build + migration check + audit               | GitHub Actions CI              |

## 4. Rules

- Never skip, weaken, or delete a failing test to get green. Fix the cause or ask.
- Tests are deterministic: no real network, fixed clock (`vi.useFakeTimers`), seeded data.
- Provider calls (eSewa, Khalti, Resend, Cloudinary) are mocked with MSW or injected fakes.
- E2E selectors: roles/labels first, `data-testid` second, never CSS classes.
- E2E runs against a fresh seeded database each run.

## 5. Setup notes

- Integration tests use a separate local database (`DATABASE_URL_TEST`, Postgres in Docker). `resetDatabase()` truncates tables between tests; factories live in `packages/core/test/factories.ts`.
- `server-only` throws outside Next.js, so `vitest.config.ts` aliases it: `resolve: { alias: { "server-only": new URL("./test/empty.ts", import.meta.url).pathname } }`.
- Canonical test shapes: `docs/examples/service-cart.test.ts` and `docs/examples/e2e-add-to-bag.spec.ts`.
