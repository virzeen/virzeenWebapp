---
name: fix-bug
description: Workflow for fixing any bug, error, failing test, broken page, or "it doesn't work" report in Virzeen. Reproduce first with a failing test, find the root cause, fix minimally, and record the lesson. Use whenever the user reports unexpected behavior, an error message, or a regression.
---

# Fix a bug

Guess-fixes create new bugs. Prove the bug, then fix the cause.

1. **Understand.** Restate the bug: expected vs actual, where, and how to trigger it. Read the docs for that area (routing table) — the docs define "expected".
2. **Reproduce.** Write a failing test that shows the bug (unit test in `packages/core` for logic, Playwright e2e or Playwright MCP session for UI). Run it and show it fails.
3. **Root cause.** Trace the code path. Explain in 1–3 sentences why it happens. Check `docs/ai/common-mistakes.md` — is it a known trap?
4. **Fix minimally.** Change only what's needed for the cause. No unrelated refactors.
5. **Prove.** The new test passes; run `pnpm turbo run lint typecheck test --affected` (and `check-ui` for UI).
6. **Prevent.** If the bug came from a missing or unclear rule, propose the doc change and add a line to the Lessons log in `docs/ai/common-mistakes.md`.
7. **Record.** Update `docs/STATUS.md`; commit as `fix(<scope>): <what was wrong>`.
