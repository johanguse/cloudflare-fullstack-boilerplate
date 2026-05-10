# Project State — Cloudflare SaaS Boilerplate

## Current Phase
**Phase 8 — i18n** (or **Phase 9 — Staging verification** in parallel per [docs/TODO.md](../../docs/TODO.md))

## Completed Phases
- ✅ Phase 1: Foundation
- ✅ Phase 2: Auth Pages & Dashboard Shell
- ✅ Phase 3: Billing & Subscriptions
- ✅ Phase 4: Invoice Management
- ✅ Phase 5: NFSe Integration
- ✅ Phase 6: Email System
- ✅ Phase 7: Production Readiness

## Key Decisions

### Architecture
- **Decision:** Single Cloudflare Worker serves both API (Hono) and frontend (Assets binding)
  - *Rationale:* Proven in llmgenerator production. Simplifies deployment. `run_worker_first: true` ensures API routes hit the Worker before Assets fallback.

- **Decision:** tRPC for dashboard API, REST for webhooks and external API
  - *Rationale:* Type safety wins for dashboard; REST required for Stripe webhooks and Trigger.dev callbacks.

- **Decision:** Better Auth over custom auth
  - *Rationale:* Already battle-tested in llmgenerator with Cloudflare D1 + KV adapters. Supports email OTP + OAuth out of the box.

- **Decision:** Trigger.dev for NFSe generation (not Cloudflare Queues)
  - *Rationale:* NFSe polling requires long waits (up to several minutes). Trigger.dev checkpointing handles this cleanly. Workers' 50ms CPU limit makes polling impossible inline.

- **Decision:** Cloudflare Email Service (not Resend)
  - *Rationale:* Native Workers binding, no API key needed for basic sending, tighter Cloudflare integration. Resend remains as fallback if Email Service domain setup is complex.

### Frontend
- **Decision:** shadcn/ui New York style, slate base color
  - *Rationale:* Matches fastapi-boilerplate-frontend config. New York style is more polished than default.

- **Decision:** TanStack Router with file-based routing
  - *Rationale:* Type-safe, code splitting, route guards. Already used in llmgenerator.

- **Decision:** TanStack Form for complex forms, React Hook Form for simple ones
  - *Rationale:* TanStack Form for multi-step or highly validated forms; RHF for quick forms with Zod.

### Database
- **Decision:** Drizzle ORM over Prisma
  - *Rationale:* Drizzle works natively with D1. Prisma requires edge adapter and adds significant bundle size.

- **Decision:** Separate schema files per domain
  - *Rationale:* auth.ts, billing.ts, invoices.ts, nfse.ts, settings.ts — easier to maintain.

### NFSe
- **Decision:** Fiscal Nacional as NFSe provider
  - *Rationale:* Same provider as llmgenerator. Unified API across municipalities. Already has `FISCAL_NACIONAL_API_KEY` secret pattern.

## Open Questions

- [ ] Should company_settings be per-user or per-account (multi-tenant future)?
  - **Current assumption:** Per-user (single-tenant boilerplate)
- [ ] Credit system included from day one or optional?
  - **Current assumption:** Included (billing schema has credit_transactions)
- [ ] PDF generation: HTML template in Worker or use a PDF library?
  - **Current assumption:** Simple HTML → stored in R2. No external PDF service.

## Dependencies (External Services Required)

| Service | Env Var | Required For |
|---------|---------|-------------|
| Cloudflare Account | wrangler login | All |
| Google Cloud (OAuth) | BETTER_AUTH_GOOGLE_* | OAuth login |
| GitHub OAuth App | BETTER_AUTH_GITHUB_* | OAuth login |
| Stripe | STRIPE_API_KEY + STRIPE_WEBHOOK_SECRET | Billing |
| Fiscal Nacional | FISCAL_NACIONAL_API_KEY | NFSe |
| Trigger.dev | TRIGGER_API_KEY | Background jobs |
| Sentry | SENTRY_DSN | Error tracking |
| PostHog | POSTHOG_KEY | Analytics |

## Blockers
None yet.

## Lessons (from llmgenerator)
- Run both `bun dev` and `bun cf:dev` together — OAuth won't work with Vite-only
- Always run `bun cf:typegen` after wrangler.jsonc changes
- Use `.dev.vars` for local secrets, never commit
- Drizzle Studio requires local DB to be touched first: `bun db:touch`
- Trigger.dev tasks need `.env` sourced before `bunx trigger.dev@latest dev`
- Better Auth session in KV requires `SESSION_KV` binding, not `LLMS_KV`
- Stripe webhook: use `timingSafeEqual` for signature validation, never string compare
- NFSe: always test in `staging` environment first (Fiscal Nacional has sandbox mode)

## Preferences
- Use `bun` over `npm` for all package commands
- Use `??` (nullish coalescing) not `||` 
- No `any`, no `as unknown as T` casts
- Avoid redundant code comments
