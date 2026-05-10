# Cloudflare SaaS Boilerplate — Project Vision

## What Is This?

A production-grade SaaS starter kit built on the Cloudflare edge stack. It provides everything a new SaaS product needs to launch: authentication, a dashboard, billing, invoices, and Brazilian NFSe generation — all pre-wired and running at the edge.

## Why This Exists

Every new SaaS project on this stack starts from scratch. The `llmgenerator` project proved the architecture works in production — this boilerplate extracts all the reusable infrastructure so the next project can skip directly to building the domain logic.

## Goals

1. **Zero config to first authenticated page** — clone → install → dev should work in under 5 minutes
2. **Production patterns from day one** — not toy examples; real Cloudflare best practices baked in
3. **Brazilian compliance included** — NFSe emission removes a major pain point for BR SaaS companies
4. **Generic enough to fork** — clean separation between boilerplate infrastructure and product logic
5. **Type-safe end-to-end** — TypeScript everywhere, tRPC for internal API, Drizzle for DB

## Non-Goals

- Not a framework — don't abstract Hono, Drizzle, or TanStack Router
- Not opinionated about business domain — keep domain tables minimal
- Not a full admin panel — focus on the patterns, not exhaustive CRUD

## Success Criteria

- New project bootstrapped in < 30 minutes (auth + dashboard working)
- All 7 phases pass type-check and lint with zero errors
- NFSe emission works in staging environment
- Stripe webhook → invoice → NFSe pipeline runs end-to-end
- Deployed to Cloudflare Workers with proper secrets management
