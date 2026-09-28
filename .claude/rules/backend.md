---
paths:
  - "apps/web/src/server/**"
  - "apps/web/src/app/api/**"
  - "packages/core/**"
  - "packages/validators/**"
---

# Backend rules (summary of docs/backend/backend-policies.md — read the full doc first)

- Every entry point follows: authenticate → authorize → rate-limit → validate (Zod from `@virzeen/validators`) → call a `core` service → map result.
- Business logic lives only in `packages/core`. Actions and routes stay under ~30 lines.
- Services return typed results and throw `AppError` with a code from `packages/core/src/errors.ts`. Never leak stack traces or DB errors to clients.
- Anything touching stock, money, or order status runs inside `db.$transaction`.
- `/api/v1/*` responses follow `docs/backend/api-contract.md` exactly. Changing a response shape means updating the contract in the same change.
- Every server-side file starts with `import "server-only"`.
- Log with the shared logger. Never log tokens, passwords, OTPs, full addresses, or phone numbers.
