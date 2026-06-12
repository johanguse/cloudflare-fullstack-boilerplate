# Cloudflare SaaS Boilerplate — Project Plan

> **Source**: Extracted from `llmgenerator` production stack  
> **Status**: Planning Phase  
> **Target**: `/home/johan/dev/boilerplate/cloudflare-boilerplate/`  
> **Last updated**: 2026-05-09

---

## Overview

A production-ready SaaS boilerplate built on the Cloudflare stack. Ships with auth, dashboard, settings, billing (Stripe), invoice management, and Brazilian NFSe (Nota Fiscal de Serviço Eletrônica) generation — all running at the edge with zero cold starts.

This boilerplate is distilled from the `llmgenerator` project, stripped of domain-specific logic, and made generic so any SaaS product can be bootstrapped in hours.

---

## Tech Stack

### Backend (Cloudflare Workers)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Cloudflare Workers | Edge compute, no cold starts |
| Framework | Hono v4 | Lightweight, fast, edge-native |
| API | tRPC v11 | Type-safe internal API for dashboard |
| REST | Hono + Zod OpenAPI | External REST API with Swagger docs |
| Database | Cloudflare D1 (SQLite) | Drizzle ORM, migrations via wrangler |
| Sessions/Cache | Cloudflare KV | Auth sessions + short-lived cache |
| File Storage | Cloudflare R2 | Invoices, PDFs, attachments |
| Auth | Better Auth v1 | Email/OTP/OAuth, KV session adapter |
| Email | Cloudflare Email Service | Transactional via Workers binding |
| Payments | Stripe v20 | Subscriptions + one-time payments |
| NFSe | Fiscal Nacional API | Brazilian electronic invoice |
| Background Jobs | Trigger.dev v4 | Async NFSe generation, long-running tasks |
| Observability | Sentry | Error tracking + source maps |
| Analytics | PostHog | Product analytics |

### Frontend (React SPA)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 19 | Concurrent features |
| Router | TanStack Router v1 | File-based, type-safe, code splitting |
| Data | tRPC + TanStack Query v5 | End-to-end type-safe, auto-caching |
| Forms | TanStack Form v1 + React Hook Form | Validated forms with Zod |
| UI | shadcn/ui (New York style) | Radix UI + Tailwind CSS v4 |
| Icons | Lucide React | Consistent icon set |
| Notifications | Sonner | Toast notifications |
| Charts | Recharts | Dashboard analytics charts |
| Animation | tw-animate-css | Smooth transitions |
| Linting | Biome | Fast formatting + linting |
| Build | Vite 7 + @cloudflare/vite-plugin | SPA build served from Workers Assets |
| Testing | Vitest + @cloudflare/vitest-pool-workers | Workers-native test environment |

---

## Project Architecture

```
cloudflare-boilerplate/
├── src/
│   ├── client/                  # React SPA
│   │   ├── components/          # Reusable UI components
│   │   │   ├── ui/              # shadcn/ui primitives
│   │   │   └── layout/          # Shell, sidebar, nav
│   │   ├── routes/
│   │   │   ├── __root.tsx       # Root layout + providers
│   │   │   ├── index.tsx        # Landing page
│   │   │   ├── (auth)/          # Login, register, verify
│   │   │   └── (protected)/     # Authenticated routes
│   │   │       ├── dashboard.tsx
│   │   │       ├── settings/
│   │   │       ├── billing/
│   │   │       └── invoices/
│   │   ├── lib/
│   │   │   ├── trpc-client.ts   # tRPC client setup
│   │   │   ├── auth-client.ts   # Better Auth client
│   │   │   └── utils.ts         # cn(), formatters
│   │   └── hooks/               # Custom React hooks
│   ├── server/                  # Cloudflare Worker
│   │   ├── index.ts             # Entry point (Hono app)
│   │   ├── db/
│   │   │   ├── schema/          # Drizzle schema files
│   │   │   ├── migrations/      # SQL migration files
│   │   │   └── index.ts         # DB connection
│   │   ├── routers/
│   │   │   ├── index.ts         # Mount all routes
│   │   │   ├── trpc/            # tRPC procedures
│   │   │   │   ├── user.ts
│   │   │   │   ├── billing.ts
│   │   │   │   ├── invoices.ts
│   │   │   │   └── settings.ts
│   │   │   └── rest/            # REST endpoints
│   │   │       ├── auth.ts
│   │   │       ├── webhooks.ts  # Stripe + external
│   │   │       └── internal.ts  # Trigger.dev callbacks
│   │   ├── services/
│   │   │   ├── auth.ts          # Better Auth instance
│   │   │   ├── billing.ts       # Stripe service
│   │   │   ├── nfse.ts          # Fiscal Nacional
│   │   │   ├── email.ts         # Cloudflare Email Service
│   │   │   └── storage.ts       # R2 service
│   │   ├── lib/
│   │   │   ├── trpc.ts          # tRPC init + context
│   │   │   └── middleware.ts    # Auth, rate limit, CORS
│   │   └── emails/              # Email templates (JSX)
│   └── shared/                  # Shared types
│       ├── types.ts
│       └── schemas.ts           # Zod schemas
├── trigger/                     # Trigger.dev tasks
│   ├── nfse-generation.ts       # Async NFSe generation
│   └── invoice-processing.ts    # Invoice workflow
├── docs/                        # This documentation
├── .specs/                      # TLC spec-driven docs
├── wrangler.jsonc               # Cloudflare config
├── trigger.config.ts            # Trigger.dev config
├── drizzle.config.ts            # Drizzle ORM config
├── vite.config.ts               # Vite + Workers plugin
├── tsconfig.json                # TypeScript config
├── components.json              # shadcn/ui config
└── biome.json                   # Biome linter config
```

---

## Core Features

### 1. Authentication (Better Auth)

**Providers:**
- Email + Password (with strength validation)
- Email OTP (magic link / verification)
- OAuth: Google, GitHub

**Features:**
- Session management via Cloudflare KV
- Email verification flow
- Password reset via email
- Two-factor authentication (TOTP)
- Remember me / session expiry

**Pages:**
- `/login` — Sign in form
- `/register` — Sign up form
- `/verify-email` — Email OTP verification
- `/forgot-password` — Reset request
- `/reset-password` — New password form

---

### 2. Dashboard

**Layout:**
- Collapsible sidebar navigation
- Top header with user menu
- Breadcrumbs
- Theme toggle (light/dark)

**Pages:**
- `/dashboard` — Overview with KPI cards + charts
- `/dashboard/profile` — User profile editor
- `/dashboard/settings` — Account preferences
- `/dashboard/billing` — Subscription + credit management
- `/dashboard/invoices` — Invoice list + detail
- `/dashboard/api-keys` — API key management

---

### 3. Settings Pages

**Account Settings (`/dashboard/settings`):**
- Display name, avatar
- Email change (with verification)
- Password change
- Danger zone (delete account)

**Notification Settings:**
- Email notification preferences
- Invoice alerts
- NFSe status notifications

**API Keys:**
- Create / revoke API keys
- Usage stats per key
- Permissions scoping

---

### 4. Billing & Subscriptions (Stripe)

**Subscription Plans:**
- Free tier (with credit limits)
- Starter / Professional / Business / Agency
- Monthly + Annual billing
- Credit-based usage tracking

**One-Time Purchases:**
- Credit packages (never expire)
- Custom amounts

**Features:**
- Subscription management (upgrade/downgrade/cancel)
- Credit balance tracking
- Usage history
- Stripe Customer Portal integration
- Webhook handler for payment events

**Pages:**
- `/dashboard/billing` — Current plan + credit balance
- `/dashboard/billing/upgrade` — Plan comparison + checkout
- `/dashboard/billing/history` — Payment history

---

### 5. Invoice Management

**Invoice List (`/dashboard/invoices`):**
- Paginated table with filters
- Status badges (draft/issued/paid/cancelled)
- Export to CSV

**Invoice Detail (`/dashboard/invoices/:id`):**
- Full invoice view
- PDF download
- NFSe status + link
- Send invoice email again action

**Invoice Generation:**
- Auto-generated on successful payment
- Manual invoice creation
- Brazilian NFSe integration

---

### 6. NFSe Generation (Fiscal Nacional)

> NFSe = Nota Fiscal de Serviço Eletrônica (Brazilian electronic service invoice required for B2B)

**Flow:**
1. Payment confirmed via Stripe webhook
2. Trigger.dev job queued
3. Invoice created in database
4. NFSe emitted to Fiscal Nacional API
5. NFSe PDF stored in R2
6. Email sent with invoice + NFSe link

**Configuration (per company):**
- CNPJ, Razão Social, Inscrição Municipal
- Service description template
- CNAE code
- City code (for ISS municipal tax)

**Status Tracking:**
- `pending` → `processing` → `issued` / `error`
- Retry logic for API failures
- Manual re-emission endpoint

---

### 7. Email System (Cloudflare Email Service)

**Transactional Emails:**
- Welcome email (on registration)
- Email verification OTP
- Password reset link
- Payment receipt
- Invoice with NFSe attachment
- Subscription change confirmations
- Low credit balance alert

**Setup:**
- Cloudflare Email Service Workers binding (`send_email`)
- React Email templates (JSX → HTML)
- SPF/DKIM via Cloudflare DNS

---

## Database Schema

### Core Tables

```sql
-- Users (managed by Better Auth)
users (id, name, email, emailVerified, image, createdAt, updatedAt)
sessions (id, userId, token, expiresAt, createdAt, updatedAt)
accounts (id, userId, accountId, providerId, ...)
verifications (id, identifier, value, expiresAt, createdAt, updatedAt)

-- API Keys
api_keys (id, userId, name, keyHash, permissions, lastUsedAt, expiresAt, createdAt)

-- Subscriptions & Credits
subscriptions (id, userId, stripeCustomerId, stripePriceId, status, currentPeriodEnd, ...)
credit_transactions (id, userId, amount, type, description, jobId, createdAt)

-- Invoices
invoices (id, userId, stripeInvoiceId, amount, currency, status, dueDate, paidAt, ...)
invoice_items (id, invoiceId, description, quantity, unitAmount, total)

-- NFSe
nfse_records (
  id, invoiceId, userId,
  fiscalNacionalId, nfseNumber, nfseVerificationCode,
  status, pdfUrl, xmlUrl,
  cnpj, razaoSocial, inscricaoMunicipal,
  serviceDescription, cnaeCode, cityCode,
  issAmount, netAmount,
  emittedAt, cancelledAt, errorMessage,
  createdAt, updatedAt
)

-- Settings
user_settings (userId, emailNotifications, invoiceAlerts, nfseAlerts, ...)
company_settings (userId, cnpj, razaoSocial, inscricaoMunicipal, serviceTemplate, ...)
```

---

## API Structure

### tRPC Procedures (Internal, Dashboard)

```
user.getProfile
user.updateProfile
user.deleteAccount
user.getApiKeys
user.createApiKey
user.revokeApiKey

billing.getSubscription
billing.getBalance
billing.getHistory
billing.purchaseCredits
billing.changePlan
billing.cancelSubscription
billing.getPortalUrl

invoices.list
invoices.getById
invoices.downloadPdf
invoices.resendEmail
invoices.create (manual)

nfse.getStatus
nfse.reEmit
nfse.getSettings
nfse.updateSettings

settings.getNotifications
settings.updateNotifications
settings.getCompany
settings.updateCompany
```

### REST Endpoints (External / Webhooks)

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout

POST /api/webhooks/stripe       — payment events
POST /api/webhooks/nfse         — NFSe status updates (if applicable)

POST /api/internal/nfse-job     — Trigger.dev callback
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1) — `phase-1-foundation`

- [ ] Project scaffold with `wrangler.jsonc` config
- [ ] TypeScript multi-target setup (client, worker, trigger)
- [ ] Vite config with `@cloudflare/vite-plugin`
- [ ] Biome setup (formatting + linting)
- [ ] shadcn/ui setup (New York style, Tailwind v4, CSS variables)
- [ ] D1 database + Drizzle ORM setup
- [ ] Initial database migration (users + sessions)
- [ ] Better Auth configuration (email + OAuth)
- [ ] Hono server entry point + middleware
- [ ] tRPC router scaffolding
- [ ] Dev scripts (`bun dev`, `bun cf:dev`, `bun dev:all`)

**Deliverable:** Running `wrangler dev` + `vite dev` serving a blank shell with auth.

---

### Phase 2: Auth Pages & Dashboard Shell (Week 2) — `phase-2-auth-dashboard`

- [ ] Auth pages: login, register, verify-email, forgot-password, reset-password
- [ ] Better Auth client setup
- [ ] Protected route guards (TanStack Router `beforeLoad`)
- [ ] Dashboard layout (sidebar + header + breadcrumbs)
- [ ] Route: `/dashboard` — placeholder overview
- [ ] Route: `/dashboard/profile` — user profile editor
- [ ] Route: `/dashboard/settings` — account settings
- [ ] Theme toggle (light/dark/system)
- [ ] Toast notifications (Sonner)
- [ ] User menu dropdown (avatar, logout)
- [ ] Responsive mobile sidebar

**Deliverable:** Full auth flow + authenticated dashboard shell.

---

### Phase 3: Billing & Subscriptions (Week 3) — `phase-3-billing`

- [ ] Stripe service layer (subscription management)
- [ ] Database schema: subscriptions, credit_transactions
- [ ] tRPC billing router
- [ ] Stripe webhook handler (payment events)
- [ ] Route: `/dashboard/billing` — plan + balance
- [ ] Route: `/dashboard/billing/upgrade` — plan selector + Stripe Checkout
- [ ] Route: `/dashboard/billing/history` — payment log
- [ ] Credit deduction/refund logic
- [ ] Low balance email alert
- [ ] Stripe Customer Portal redirect

**Deliverable:** Working Stripe subscriptions + credit purchases.

---

### Phase 4: Invoice Management (Week 4) — `phase-4-invoices`

- [ ] Database schema: invoices, invoice_items
- [ ] Invoice creation on Stripe payment webhook
- [ ] tRPC invoices router (list, getById, create)
- [ ] Route: `/dashboard/invoices` — paginated list with filters
- [ ] Route: `/dashboard/invoices/:id` — invoice detail
- [ ] Invoice PDF generation (stored in R2)
- [ ] Invoice email (with PDF attachment)
- [ ] CSV export endpoint

**Deliverable:** Full invoice lifecycle from payment to email.

---

### Phase 5: NFSe Integration (Week 5) — `phase-5-nfse`

- [ ] Fiscal Nacional API client service
- [ ] Database schema: nfse_records, company_settings
- [ ] Trigger.dev task: `nfse-generation`
- [ ] NFSe emission on invoice creation (auto-trigger)
- [ ] NFSe PDF + XML storage in R2
- [ ] Route: NFSe status in invoice detail
- [ ] Route: `/dashboard/settings/company` — company data (CNPJ, etc.)
- [ ] tRPC nfse router (status, re-emit, settings)
- [ ] Retry logic for failed emissions
- [ ] NFSe issued email with PDF link

**Deliverable:** Automated NFSe generation pipeline.

---

### Phase 6: Email System (Week 6) — `phase-6-email`

- [x] Cloudflare Email Service binding setup
- [x] Email service abstraction layer
- [x] Email templates: welcome, verification, reset, receipt, invoice, NFSe, alerts
- [x] Domain DNS configuration guide
- [x] SPF/DKIM setup documentation
- [x] API key management pages + tRPC router
- [x] Notification settings (database + UI)

**Deliverable:** Full transactional email system.

---

### Phase 7: Production Readiness (Week 7) — `phase-7-production`

- [x] Sentry integration (Workers + React)
- [x] PostHog analytics setup
- [x] Observability: `wrangler.jsonc` `observability.enabled: true`
- [x] Vitest setup with `@cloudflare/vitest-pool-workers`
- [x] Core test coverage (tRPC guards, health, NFSe client smoke; webhook E2E deferred)
- [x] Environment configuration guide (`docs/DEPLOYMENT.md`, `.env.*.example`)
- [x] Wrangler secrets documentation (upload script + examples)
- [x] README with setup guide
- [x] Deploy guide (`docs/DEPLOYMENT.md`; staging verify manual)

**Deliverable:** Production-deployable boilerplate with monitoring.

---

## Cloudflare Best Practices Applied

Based on `~/.agents/skills/workers-best-practices`:

| Rule | Implementation |
|------|---------------|
| `compatibility_date` | Set to current date, updated quarterly |
| `nodejs_compat` flag | Enabled — required by Better Auth, Stripe SDK |
| `wrangler types` | Generated `worker-configuration.d.ts`, never hand-written |
| Secrets via wrangler | All secrets in `wrangler secret put`, never hardcoded |
| `wrangler.jsonc` | JSON config (not TOML) for all non-secret settings |
| Bindings over REST | D1, KV, R2 accessed via bindings, not Cloudflare REST API |
| `ctx.waitUntil()` | Post-response analytics + audit logging |
| No global state | Request-scoped context only |
| Streaming responses | Large files streamed from R2 |
| Structured logging | JSON logs with `wrangler tail` support |
| No `Math.random()` | `crypto.randomUUID()` for all IDs/tokens |
| Timing-safe comparisons | `crypto.subtle.timingSafeEqual` for secret validation |
| No `passThroughOnException` | Explicit try/catch with structured error responses |

---

## Cloudflare Bindings Layout (wrangler.jsonc)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "cf-boilerplate",
  "main": "./src/server/index.ts",
  "compatibility_date": "2026-05-09",
  "compatibility_flags": ["nodejs_compat"],
  "upload_source_maps": true,
  "placement": { "mode": "smart" },
  "observability": { "enabled": true, "head_sampling_rate": 1 },

  "assets": {
    "binding": "ASSETS",
    "directory": "./dist/client",
    "run_worker_first": true,
    "not_found_handling": "single-page-application"
  },

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cf-boilerplate-db",
      "database_id": "<TO_BE_PROVISIONED>",
      "migrations_dir": "src/server/db/migrations"
    }
  ],

  "kv_namespaces": [
    { "binding": "SESSION_KV", "id": "<TO_BE_PROVISIONED>" },
    { "binding": "CACHE_KV",   "id": "<TO_BE_PROVISIONED>" }
  ],

  "r2_buckets": [
    { "binding": "STORAGE", "bucket_name": "cf-boilerplate-storage" }
  ],

  // Cloudflare Email Service
  "send_email": [
    { "name": "EMAIL" }
  ],

  // Triggers
  "triggers": {
    "crons": ["0 6 * * *"]
  },

  // Non-sensitive vars
  "vars": {
    "ENVIRONMENT": "production",
    "APP_NAME": "My SaaS",
    "BETTER_AUTH_URL": "https://app.yourdomain.com",
    "TRUSTED_ORIGINS": "https://app.yourdomain.com"
  }
}
```

---

## Required Secrets (wrangler secret put)

```
BETTER_AUTH_SECRET              — Random 32-char secret
BETTER_AUTH_GOOGLE_CLIENT_ID    — Google OAuth
BETTER_AUTH_GOOGLE_CLIENT_SECRET
BETTER_AUTH_GITHUB_CLIENT_ID    — GitHub OAuth  
BETTER_AUTH_GITHUB_CLIENT_SECRET
STRIPE_API_KEY                  — Stripe secret key
STRIPE_WEBHOOK_SECRET           — Stripe webhook signing secret
FISCAL_NACIONAL_API_KEY         — NFSe provider API key
SENTRY_DSN                      — Sentry DSN (optional)
POSTHOG_KEY                     — PostHog key (optional)
INTERNAL_API_KEY                — Trigger.dev callback auth
TRIGGER_API_KEY                 — Trigger.dev API key
```

---

## NFSe Integration Details

### Fiscal Nacional API

The NFSe system uses the [Fiscal Nacional](https://fiscalnacional.com.br) API, which provides a unified interface for emitting NFSe across multiple Brazilian municipalities.

**Key concepts:**
- Each company needs CNPJ + Inscrição Municipal
- Service is described via CNAE code + service description
- ISS (Imposto Sobre Serviços) rate varies by city and service type
- NFSe is only required for service invoices (not product sales)

**Background Job Flow:**
```
Stripe webhook (payment.succeeded)
  → Create invoice record
  → Queue Trigger.dev nfse-generation task
  → Fetch company settings (CNPJ, city, etc.)
  → Call Fiscal Nacional API
  → Poll for status (issued/error)
  → Store PDF + XML in R2
  → Send email with NFSe link
  → Update invoice record
```

**Data required per emission:**
```typescript
{
  // Provider
  cnpj: string,           // "XX.XXX.XXX/XXXX-XX"
  inscricaoMunicipal: string,

  // Taker (customer)
  takerName: string,
  takerDocument: string,  // CPF or CNPJ
  takerEmail: string,

  // Service
  serviceDescription: string,
  cnaeCode: string,       // e.g. "6201-5/01"
  cityCode: number,       // IBGE code

  // Financials
  serviceAmount: number,  // in cents
  issRate: number,        // e.g. 0.05 = 5%
  deductions: number,
}
```

---

## shadcn/ui Setup

Based on `fastapi-boilerplate-frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/client/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@client/components",
    "utils": "@client/lib/utils",
    "ui": "@client/components/ui",
    "lib": "@client/lib",
    "hooks": "@client/hooks"
  },
  "iconLibrary": "lucide"
}
```

**Components to install initially:**
- button, input, label, form, card
- dialog, sheet, dropdown-menu, popover
- select, checkbox, radio-group, switch
- table, badge, avatar, separator
- tabs, progress, skeleton
- navigation-menu, breadcrumb, sidebar
- command, sonner (toast)
- alert, alert-dialog
- calendar, date-picker (react-day-picker)

---

## File Naming Conventions

| Concern | Convention | Example |
|---------|-----------|---------|
| React components | PascalCase | `InvoiceCard.tsx` |
| Utilities / hooks | camelCase | `useInvoices.ts` |
| Route files | kebab-case | `invoice-detail.tsx` |
| DB schema files | kebab-case | `nfse-records.ts` |
| tRPC routers | camelCase | `billingRouter.ts` |
| Server services | camelCase | `fiscalNacionalService.ts` |

---

## TypeScript Path Aliases

```json
{
  "@client/*": ["src/client/*"],
  "@server/*": ["src/server/*"],
  "@shared/*": ["src/shared/*"]
}
```

---

## Dev Commands (Target)

```bash
# Development
bun dev              # Vite frontend dev server (localhost:5173)
bun cf:dev           # Cloudflare Worker dev (localhost:8787)
bun dev:all          # Both concurrently (WSL script)

# Database
bun db:generate      # Generate migration from schema change
bun db:migrate       # Apply migrations locally
bun db:migrate:prod  # Apply migrations to production D1
bun db:studio        # Drizzle Studio UI

# Deploy
bun build            # Production build
bun cf:deploy        # Deploy to Cloudflare Workers
bun cf:typegen       # Regenerate TypeScript bindings

# Background Jobs
bun trigger:dev      # Local Trigger.dev dev server
bun trigger:deploy   # Deploy tasks to Trigger.dev

# Quality
bun check            # Biome lint + format
bun type-check       # TypeScript check (no emit)
bun test             # Run Vitest
```

---

## Risk & Dependencies

| Risk | Mitigation |
|------|-----------|
| Fiscal Nacional API changes | Abstract behind service interface, version pin |
| NFSe city coverage gaps | Check municipality list before promising coverage |
| Stripe webhook reliability | Idempotency keys + job deduplication |
| D1 limits (10 MB row, 1 GB total) | Monitor usage, archive old records |
| Workers CPU time (50ms limit on free) | Offload heavy work to Trigger.dev |
| Cloudflare Email deliverability | SPF/DKIM + proper reputation warm-up |

---

## Out of Scope (v1)

- Multi-tenant / team accounts
- White-labeling
- Plugin system
- Mobile app
- Offline support
- Real-time WebSocket features (beyond Trigger.dev realtime)
- Multiple languages (i18n)
- AI features
- Advanced analytics (charts beyond basics)

These can be added from the `llmgenerator` source as needed.

---

## References

- Source project: `/home/johan/dev/llmgenerator-project/llmgenerator/`
- shadcn/ui source: `/home/johan/dev/boilerplate/fastapi-boilerplate-frontend/`
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Better Auth docs: https://www.better-auth.com/
- Fiscal Nacional docs: https://fiscalnacional.com.br/docs
- Trigger.dev docs: https://trigger.dev/docs
- Stripe docs: https://stripe.com/docs
