---
name: db-change
description: Workflow for any Prisma schema change, migration, index, enum, or seed change in Virzeen. Use whenever packages/db is touched or a feature needs a new field, model, relation, or enum value.
---

# Database change workflow

1. Read `docs/database/data-rules.md`.
2. Describe the change: models/fields added or changed, relations with `onDelete`, indexes, and whether it's destructive.
3. Destructive (drop/rename/type change)? Plan expand → migrate data → contract across two deploys, and get owner approval.
4. Edit `packages/db/prisma/schema.prisma` following the hard rules (money as `Int` paisa ending in `Paisa`, cuid2 ids, timestamps, explicit `onDelete`, indexes).
5. `pnpm db:migrate --name <snake_case_description>` locally. Never edit an existing migration.
6. Check it applies on an empty DB: `pnpm db:reset:local` (local only) then run tests.
7. Update validators and core services that use the model.
8. Update the model table in `docs/database/data-rules.md` and `docs/STATUS.md`.
