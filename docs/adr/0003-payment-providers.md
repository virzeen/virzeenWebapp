# ADR-0003: eSewa, Khalti and COD behind one provider interface

**Date:** 2026-09-28
**Status:** Accepted

## Context

Phase 1 sells in Nepal where eSewa, Khalti and cash on delivery dominate. Cross-border (Stripe/PayPal) comes later.

## Decision

`packages/core/src/payments/provider.ts` defines `initiate(order)` and `verify(ref)`. eSewa, Khalti and COD implement it. Verification is always server-to-server. Reconciliation cron handles missing callbacks.

## Alternatives considered

- Provider-specific logic inside checkout — hard to test, hard to extend.
- Trusting redirect params — insecure.

## Consequences

Adding a provider = one adapter + tests. All providers share the state machine and idempotency rules in payment-policy.md.
