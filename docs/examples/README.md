# Canonical Examples

Copy the shape of these files when writing similar code. They show the project's conventions in one place: imports, naming, layering, states, accessibility, and tests.
They are reference patterns (not wired into the app), so names like `openCartDrawer` stand in for the real helpers.

| File                           | Pattern                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| `primitive-button.tsx`         | A `packages/ui` primitive with `cva` variants, loading state, a11y      |
| `primitive-button.stories.tsx` | Storybook story covering every variant and state                        |
| `page-product.tsx`             | Server Component page: metadata, `notFound`, layout, JSON-LD            |
| `client-add-to-bag.tsx`        | Small client leaf calling a Server Action with pending + error handling |
| `form-address.tsx`             | React Hook Form + shared Zod schema + server errors                     |
| `service-cart.ts`              | Core service: validation of business rules, transaction, `AppError`     |
| `service-cart.test.ts`         | Service tests named as behaviors                                        |
| `e2e-add-to-bag.spec.ts`       | Playwright journey using role-based locators                            |

The canonical Server Action is in `docs/backend/backend-policies.md` §2.
