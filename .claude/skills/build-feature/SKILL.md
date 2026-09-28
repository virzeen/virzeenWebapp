---
name: build-feature
description: The step-by-step workflow for building or changing any Virzeen feature — reading the right docs, writing a spec, making a todo plan, checking Storybook and existing services, implementing layer by layer, verifying, and recording. Use this for ANY task that adds or changes behavior (new page, new endpoint, new service, bug fix with behavior change), even if the user just says "add X" or "make Y work".
---

# Build a feature

The point of this workflow is that every change is driven by the docs and the spec, not by guesses. Follow the steps in order and show your work at each gate.

## Step 1 — Load context

- Read `docs/STATUS.md` (current phase and what's in progress).
- Classify the task using the routing table in `CLAUDE.md` §3 and read **every** doc it lists for the matched rows.
- Tell the user in one short list which docs you read.

## Step 2 — Spec gate

- Look for `docs/specs/<feature>.md`.
- If it exists: extract its acceptance criteria. These are your requirements.
- If it doesn't exist and the change adds behavior: draft one from `docs/specs/_TEMPLATE.md`, show it, and **wait for approval** before writing code.
- If a small bug fix: write the expected behavior in one sentence and confirm it matches the docs.

## Step 3 — Discovery (reuse before you create)

- UI: query the Storybook MCP — `list-all-documentation`, then `get-documentation` for every component you plan to use. Note which primitives exist and which are missing.
- Logic: search `packages/core/src` for existing services; search `packages/validators/src` for existing schemas.
- Data: check `docs/database/data-rules.md` for existing models.
- Patterns: open the matching canonical file in `docs/examples/` and follow its shape.
- Libraries: confirm APIs against the installed version (Context7 MCP or the package's types in `node_modules`) — especially Next.js, Tailwind v4, Zod, Prisma, Better Auth.

## Step 4 — Plan as a todo list

Create todos in this order, each naming its file(s) and the doc section it follows:

1. Validators (`packages/validators`)
2. Schema/migration if needed (use the `db-change` skill)
3. Core service + unit tests (`packages/core`)
4. Server action / API route (`apps/web/src/server`, `app/api`)
5. Missing primitives + stories (use the `ui-component` skill)
6. Feature components (`apps/web/src/client/features`)
7. Page wiring (`apps/web/src/app`)
8. E2E test if the feature is a critical journey
9. Docs: api-contract, data-rules, STATUS.md

Show the plan. For payment, auth, or schema work, wait for approval of the plan.

## Step 5 — Implement

- One todo at a time. Mark it done only when it compiles and its tests pass.
- Follow the canonical action shape in `docs/backend/backend-policies.md` §2.
- If you hit something the docs don't cover, stop and ask rather than inventing a rule.

## Step 6 — Verify

- `pnpm turbo run lint typecheck test --affected`
- UI changed → run the `verify-ui` skill.
- Payments/auth changed → run the `security-reviewer` agent on the diff.

## Step 7 — Done and recorded

- Walk through `docs/definition-of-done.md`, stating pass/fail per applicable item.
- Update `docs/STATUS.md` (log line + next step) and any doc whose rules changed.
- Commit on a feature branch with a Conventional Commit message.
