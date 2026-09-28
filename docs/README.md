# Virzeen Documentation Index

These docs are the rules for building Virzeen. Humans and AI agents follow them the same way.
If code and docs disagree, that is a bug: raise it, don't pick silently.

## Read order for a new contributor (or a new AI session)

1. `project-brief.md` — what Virzeen is and every decision made so far
2. `STATUS.md` — where the project is right now
3. `architecture.md` — how the system fits together
4. `conventions.md` — naming, folders, branches, commits
5. `definition-of-done.md` — what "finished" means
6. The domain doc for your task (table below)

## Map

| Doc                           | Owns the rules for                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `project-brief.md`            | Business context and all planning decisions with reasons                               |
| `STATUS.md`                   | Current phase, in-progress work, next steps, known issues                              |
| `architecture.md`             | System layout, layers, request flow, environments, env vars                            |
| `conventions.md`              | Naming, file layout, imports, git workflow, commit messages                            |
| `definition-of-done.md`       | The checklist every change must pass                                                   |
| `glossary.md`                 | Business and technical terms, order/payment statuses                                   |
| `ui/ui-discipline.md`         | UI hub: principles, layers, Storybook, React rules, states, accessibility, enforcement |
| `ui/design-tokens.md`         | Exact color, type, spacing, radius, shadow, motion, z-index values                     |
| `ui/components-catalog.md`    | Approved components and when to use which                                              |
| `ui/patterns.md`              | Page, form, list, product page, cart, checkout, portfolio, admin patterns              |
| `ui/content-style.md`         | UI copy: voice, button labels, messages, error text, formatting                        |
| `ui/performance-seo.md`       | Performance budgets, SEO metadata, PWA rules                                           |
| `ai/common-mistakes.md`       | Known traps + lessons log (loaded every AI session)                                    |
| `examples/`                   | Canonical code to copy: primitive, story, page, client leaf, form, service, tests      |
| `backend/backend-policies.md` | Actions, routes, services, errors, transactions, logging                               |
| `backend/api-contract.md`     | Every `/api/v1` endpoint (used by web and mobile)                                      |
| `database/data-rules.md`      | Prisma models, money, migrations, indexes                                              |
| `payments/payment-policy.md`  | eSewa, Khalti, COD flows, state machine, refunds, reconciliation                       |
| `security/security-policy.md` | Auth, sessions, admin, secrets, headers, rate limits, OWASP                            |
| `testing/testing-strategy.md` | Unit, e2e, Playwright MCP verification, what must be tested                            |
| `specs/`                      | One spec per feature with acceptance criteria                                          |
| `adr/`                        | Why major decisions were made                                                          |
| `runbooks/`                   | What to do when something breaks in production                                         |

## How docs change

- A doc changes in the same pull request as the code that needs the change.
- New rules require the owner's approval. An agent may propose a rule, never enact one alone.
- Superseded decisions get a new ADR; old ADRs are marked "Superseded by ADR-00XX", never deleted.
- Keep docs short and specific. A rule that can't be checked isn't a rule.
