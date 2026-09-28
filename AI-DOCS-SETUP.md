# Virzeen AI Docs Pack — Setup Guide

This pack makes Claude Code follow your docs instead of guessing. You can delete this file after setup.

## How it keeps the agent on track

| Layer          | File(s)                                                            | What it does                                                                                                                                    | Can the agent skip it?                    |
| -------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1. Manual      | `CLAUDE.md`                                                        | Every session: golden rule, task protocol, routing table, UI essentials, non-negotiables, working style                                         | Rarely — always in context                |
| 2. Known traps | `docs/ai/common-mistakes.md`                                       | Imported into CLAUDE.md, so stack pitfalls load every session                                                                                   | Rarely                                    |
| 3. Auto rules  | `.claude/rules/*.md`                                               | Load when the agent opens matching files (UI, primitives, backend, payments, DB, tests)                                                         | Rarely — injected by path                 |
| 4. Workflows   | `.claude/skills/*`                                                 | build-feature, ui-component, payment-change, db-change, verify-ui, fix-bug                                                                      | Possible — CLAUDE.md requires them        |
| 5. Examples    | `docs/examples/*`                                                  | Canonical code to copy: primitive, story, page, client leaf, form, service, tests                                                               | Possible — protocol step 5 requires them  |
| 6. Eyes        | `.mcp.json`                                                        | Storybook MCP (real props), Playwright MCP (real browser), Context7 MCP (current library docs)                                                  | —                                         |
| 7. Reviewers   | `.claude/agents/*`                                                 | security-reviewer, ui-reviewer                                                                                                                  | —                                         |
| 8. Enforcement | `.claude/settings.json`, `.claude/hooks/*`, `scripts/check-ui.mjs` | STATUS injected at start; every edit formatted, linted and UI-guarded; unsafe git blocked; checks must pass before finishing; `.env` unreadable | **No** — hooks always run                 |
| 9. Git gates   | `.husky/*`                                                         | Same checks for anyone committing/pushing                                                                                                       | Only with `--no-verify`, which is blocked |
| 10. Final gate | GitHub CI                                                          | Everything, before merge                                                                                                                        | No                                        |

## Install

1. Copy everything into the root of your `virzeen` repo (keep dot-folders `.claude`, `.husky`, `.github`).
2. `chmod +x .claude/hooks/*.sh` (macOS/Linux/Git Bash). On Windows, install Git for Windows so hooks run in Git Bash.
3. `.gitignore` must include: `.env`, `.env.local`, `.env.*.local`, `.claude/settings.local.json`.
4. Husky: `pnpm add -D husky lint-staged && pnpm exec husky init`, then keep the provided `.husky/pre-commit` and `.husky/pre-push`.
5. Storybook MCP: in `packages/ui` run `pnpm exec storybook add @storybook/addon-mcp`. Available while `pnpm storybook` runs (port 6006).
6. Playwright MCP runs through `npx`; if browsers are missing: `npx playwright install chromium`.
7. Context7 MCP runs through `npx`; no setup needed for normal use.
8. Open Claude Code in the repo root, approve the project MCP servers, run `/hooks` and `/memory` to confirm hooks and CLAUDE.md (with the common-mistakes import) loaded.

## Tooling the docs assume (install while scaffolding)

- ESLint plugins: `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`, `eslint-plugin-boundaries`, `@next/eslint-plugin-next`.
- Prettier + `prettier-plugin-tailwindcss`.
- UI: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, shadcn/ui (Radix) primitives.
- Forms: `react-hook-form`, `@hookform/resolvers`, `zod`.
- Tests: `vitest` (with the `server-only` alias from testing-strategy.md §5), `@playwright/test`, Storybook a11y addon.
- In `apps/web` global CSS: `@source "../../../packages/ui/src";` so Tailwind v4 sees primitive classes.

## Scripts your package.json must provide

`dev`, `storybook`, `test:e2e`, `db:migrate`, `db:studio`, `db:reset:local`, and Turborepo tasks `lint`, `typecheck`, `test`.

**Brand-new empty repo:** the Stop hook needs those scripts. While scaffolding, create `.claude/settings.local.json` with `{ "disableAllHooks": true }`; delete it once `pnpm turbo run lint typecheck test` works. The UI guard (`node scripts/check-ui.mjs`) works immediately.

## First prompts

1. > Read CLAUDE.md and docs/README.md. Scaffold the monorepo exactly as in docs/architecture.md and docs/conventions.md, with the scripts and tooling in AI-DOCS-SETUP.md. Show me the plan first.
2. > Build the design system foundation: tokens.css from docs/ui/design-tokens.md, then the primitives in docs/ui/components-catalog.md §1, each with a Storybook story, following docs/examples/primitive-button.tsx. Use the ui-component skill.

Build primitives and Storybook **before** pages. Every later UI task then has real components to discover instead of inventing new ones.

## Best practices for working with the agent

- **One task per session.** Run `/clear` between unrelated tasks so old context doesn't leak in.
- **Plan mode for big tasks.** Ask for the plan first, approve it, then let it build.
- **Specs before features.** A spec with testable acceptance criteria is the biggest quality lever.
- **Fix the rule, not just the code.** When the agent makes a mistake, add a line to `docs/ai/common-mistakes.md` (Lessons log) or sharpen the doc, so it can't repeat it.
- **Keep CLAUDE.md short** (under ~200 lines). Detail belongs in `docs/` and `.claude/rules/`.
- **Review every `ui-allow:`** exception in PRs.
- Fill in placeholders: brand tokens (◆ in design-tokens.md), COD limit, shipping rates, security email.
