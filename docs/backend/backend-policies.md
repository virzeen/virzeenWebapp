# Backend Policies

## 1. Layers and responsibilities

| Layer         | Location                           | Does                                                                 | Never does                           |
| ------------- | ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Server action | `apps/web/src/server/actions/*.ts` | auth, authorize, rate-limit, validate, call core, revalidate cache   | business rules, direct Prisma writes |
| API route     | `apps/web/src/app/api/**/route.ts` | same as actions, plus HTTP status mapping                            | business rules                       |
| Query         | `apps/web/src/server/queries/*.ts` | read-only data for pages (may call Prisma directly for simple reads) | writes                               |
| Core service  | `packages/core/src/**`             | all business rules, transactions                                     | read cookies/headers/request         |
| DB            | `packages/db`                      | schema, client                                                       | logic                                |

## 2. The canonical server action

Every action follows this shape. Copy it; don't improvise.

```ts
"use server";
import "server-only";
import { addToCartSchema } from "@virzeen/validators";
import { cartService } from "@virzeen/core";
import { getSessionOrGuest } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";
import { toActionResult } from "@/server/actions/result";
import { revalidatePath } from "next/cache";

export async function addToCartAction(input: unknown) {
  const actor = await getSessionOrGuest(); // 1. authenticate
  await rateLimit("cart:add", actor.key); // 2. rate-limit
  const data = addToCartSchema.parse(input); // 3. validate
  const result = await toActionResult(() =>
    // 4. core + error mapping
    cartService.addItem({ cartId: actor.cartId, ...data }),
  );
  if (result.ok) revalidatePath("/cart"); // 5. cache
  return result;
}
```

Admin actions add `await requireRole("ADMIN")` right after authentication.

## 3. Results and errors

- Actions return `{ ok: true, data } | { ok: false, error: { code, message, fields? } }`. `fields` (field → message) is present only for `VALIDATION_FAILED` so forms can show errors under inputs. Never throw to the client.
- Core services throw `AppError(code, message, meta?)`. Codes are a closed list in `packages/core/src/errors.ts`:
  `UNAUTHENTICATED, FORBIDDEN, VALIDATION_FAILED, NOT_FOUND, OUT_OF_STOCK, PRICE_CHANGED, CART_EMPTY, PAYMENT_FAILED, PAYMENT_PENDING, PAYMENT_AMOUNT_MISMATCH, INVALID_STATE_TRANSITION, RATE_LIMITED, CONFLICT, INTERNAL`
- Unknown errors become `INTERNAL` with a generic message; the real error goes to Sentry and the logger.
- Adding a code means updating `errors.ts`, this list, and `api-contract.md` together.

## 4. Validation

- Zod schemas live in `packages/validators`, one file per domain. Client forms and server entry points import the same schema.
- Validate at every boundary: actions, routes, webhook/callback params, cron inputs.
- Use `.strict()` on object schemas so unknown fields are rejected.
- IDs are `cuid2` strings; validate format.
- Nepali phone numbers: 10 digits starting with 97 or 98.

## 5. Transactions and concurrency

- Anything that changes stock, money, or order/payment status uses `db.$transaction`.
- Stock decrement uses a conditional update (`where: { id, stock: { gte: qty } }`) and checks the affected count. Never read-then-write.
- Status updates are conditional on the current status (`where: { id, status: "PENDING" }`) so duplicates are no-ops.

## 6. Caching and revalidation

- Product/portfolio pages: cached, revalidated by tag when admin edits (`revalidateTag("product:<id>")`).
- Cart, checkout, account, admin: never cached (`dynamic` rendering).

## 7. Logging and monitoring

- Use `logger` (`apps/web/src/server/logger.ts`). Levels: `info` for business events (order created, payment verified), `warn` for recoverable issues, `error` for failures.
- Every log line for an order includes `orderNumber`. Never log secrets, tokens, OTPs, card/wallet ids, full addresses, or phone numbers.
- Errors go to Sentry with PII scrubbing on.

## 8. Background work

- Scheduled jobs are `/api/cron/*` routes protected by `CRON_SECRET` (header `Authorization: Bearer <CRON_SECRET>`), called by the Railway cron service.
- Jobs must be idempotent and safe to run twice at the same time.

## 9. Emails

- Sent from core services after the transaction commits (never inside it).
- Templates in `packages/emails`. Every email has a plain-text fallback.

## 10. Adding a dependency

State the reason in the PR, check last release date and weekly downloads, prefer packages already in the repo. No packages for things a few lines of code can do.
