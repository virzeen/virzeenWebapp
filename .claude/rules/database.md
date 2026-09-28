---
paths:
  - "packages/db/**"
---

# Database rules (summary of docs/database/data-rules.md — read the full doc first)

- Use the `db-change` skill for any schema change.
- Money fields are `Int` in paisa and end with `Paisa` (e.g. `totalPaisa`).
- Never edit or delete an applied migration. Create a new one.
- Never run `prisma migrate reset`, `db push`, or raw destructive SQL against staging/production.
- New relations get explicit `onDelete` behavior. Foreign keys and lookup fields get indexes.
- Update the model table in docs/database/data-rules.md in the same change.
