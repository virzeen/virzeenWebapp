# Definition of Done

A task is done only when every applicable box is true. Agents: go through this list item by item and state the result.

## Always

- [ ] Matches the spec's acceptance criteria (or the owner's written instruction)
- [ ] Follows the domain docs from the CLAUDE.md routing table
- [ ] `pnpm turbo run lint typecheck test` passes
- [ ] No `any`, no `console.log`, no commented-out code, no TODO without an issue link
- [ ] No secrets, tokens, or personal data in code, logs, fixtures, or screenshots
- [ ] `docs/STATUS.md` updated; any changed rule is updated in its doc

## If UI changed

- [ ] Built from `@virzeen/ui` primitives; any new primitive has a Storybook story
- [ ] `node scripts/check-ui.mjs --changed` passes (tokens, images, money, imports)
- [ ] Component choice matches `ui/components-catalog.md`; layout matches `ui/patterns.md`
- [ ] All text matches `ui/content-style.md`
- [ ] Loading, empty, and error states exist
- [ ] Verified with the `verify-ui` skill at 360 / 768 / 1280px, no console errors
- [ ] Keyboard navigable, visible focus, labels on inputs, alt text on images

## If backend changed

- [ ] Entry point order: auth → authorize → rate-limit → validate → core
- [ ] Logic lives in `packages/core` with unit tests
- [ ] Money/stock/status writes are inside a transaction
- [ ] `/api/v1` changes are reflected in `backend/api-contract.md`

## If payments, orders, or auth changed

- [ ] `payment-policy.md` / `security-policy.md` re-read and followed
- [ ] Tests cover success, failure, amount mismatch, replay/duplicate, and pending
- [ ] `security-reviewer` agent run on the diff; findings resolved
- [ ] Owner has reviewed the PR (never self-merge payment changes)

## If database changed

- [ ] New migration created (no edited migrations), applied cleanly on a fresh DB
- [ ] `database/data-rules.md` model table updated
