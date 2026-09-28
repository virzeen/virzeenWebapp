# ADR-0001: Turborepo monorepo with apps/ and packages/

**Date:** 2026-09-28
**Status:** Accepted

## Context

Virzeen needs a website now and Android/iOS apps later, built by a solo developer with AI agents, sharing business logic and design.

## Decision

One repo, pnpm workspaces + Turborepo. `apps/web` (Next.js, frontend + backend), `apps/mobile` (Capacitor). Shared `packages/core`, `db`, `validators`, `ui`, `emails`, `config`. Inside `apps/web/src`, `client/` and `server/` are separated and enforced by lint rules.

## Alternatives considered

- Polyrepo (separate frontend/backend/mobile) — duplicated code and version drift for one developer.
- Separate backend service (NestJS/Hono) — two deployments, CORS/token complexity, ~1 extra week; not needed yet.
- Microservices — far beyond current scale and budget.

## Consequences

One CI pipeline and atomic changes across layers. Must keep package boundaries strict. A standalone API can be extracted later because `packages/core` is framework-independent.
