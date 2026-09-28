---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "apps/web/tests/**"
---

# Testing rules (summary of docs/testing/testing-strategy.md)

- Test behavior, not implementation. Name tests as sentences: `it("rejects a cart item with quantity above stock")`.
- Never weaken, skip, or delete a failing test to make a check pass. Fix the code or ask.
- E2E tests use `data-testid` selectors or accessible roles, never CSS classes.
- Payment tests mock provider HTTP calls. Never hit live eSewa/Khalti from tests.
