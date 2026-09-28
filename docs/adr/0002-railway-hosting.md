# ADR-0002: Host on Railway (Singapore) with Railway Postgres

**Date:** 2026-09-28
**Status:** Accepted

## Context

Commercial shop, tiny budget, customers in Nepal, need always-on hosting with no expiring database.

## Decision

Railway Hobby: `web` service (Next.js) + Postgres + `cron` service, all in the Singapore region. Cloudflare in front. Nightly backups to R2.

## Alternatives considered

- Vercel Hobby — free plan is non-commercial.
- Render free — database expires after 30 days, cold starts.
- Supabase free — pauses after inactivity.
- Vercel Pro + Supabase Pro (Mumbai) — best performance, ~$45/month; revisit when revenue justifies it.

## Consequences

Usage-based billing: set a usage limit in Railway. Own backups required. Migration to another host is a DB dump + redeploy.
