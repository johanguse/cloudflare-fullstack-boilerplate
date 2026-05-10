# Cloudflare SaaS Boilerplate — Roadmap

## Phase 1: Foundation `phase-1-foundation`
**Status:** ✅ COMPLETED | **Effort:** ~1 week

### Objective
Scaffold the complete project structure with all tooling in place. By the end, `bun dev:all` works and serves a blank React page through the Worker.

### Deliverables
- [ ] `wrangler.jsonc` with D1, KV, R2, Email Service, staging + local envs
- [ ] `tsconfig.json` multi-target (client, worker, trigger)
- [ ] `vite.config.ts` with `@cloudflare/vite-plugin` + TanStack Router plugin
- [ ] `biome.json` (formatting + linting rules)
- [ ] `components.json` (shadcn/ui New York style, Tailwind v4)
- [ ] Drizzle schema: users, sessions, api_keys (Better Auth tables)
- [ ] Initial D1 migration generated and applied locally
- [ ] Better Auth server configured (email + Google + GitHub)
- [ ] Hono entry point with middleware (CORS, rate limit, auth)
- [ ] tRPC server scaffolding (router init + context)
- [ ] Dev scripts: `bun dev`, `bun cf:dev`, `bun dev:all:wsl`
- [ ] `.dev.vars.example` with all required secrets listed
- [ ] `README.md` with setup instructions

---

## Phase 2: Auth Pages & Dashboard Shell `phase-2-auth-dashboard`
**Status:** ✅ COMPLETED | **Effort:** ~1 week

### Objective
Complete authentication flow + the dashboard chrome. Users can register, log in, and land on a working dashboard with navigation.

### Deliverables
- [ ] `/login` page (email + password + OAuth buttons)
- [ ] `/register` page with validation
- [ ] `/verify-email` — OTP verification page
- [ ] `/forgot-password` + `/reset-password` pages
- [ ] Better Auth client (`src/client/lib/auth-client.ts`)
- [ ] Protected route guard in TanStack Router
- [ ] Dashboard layout: collapsible sidebar + top header
- [ ] Sidebar navigation with icons (lucide-react)
- [ ] User menu dropdown (avatar, profile link, logout)
- [ ] Theme toggle (light/dark/system)
- [ ] `/dashboard` — overview page with placeholder KPI cards
- [ ] `/dashboard/profile` — edit name, email, avatar
- [ ] `/dashboard/settings` — account settings + danger zone
- [ ] Sonner toast integration
- [ ] Responsive mobile sidebar (Sheet)
- [ ] `user` tRPC router: getProfile, updateProfile, deleteAccount

---

## Phase 3: Billing & Subscriptions `phase-3-billing`
**Status:** ✅ COMPLETED | **Effort:** ~1 week

### Objective
Stripe subscriptions + credits fully working. Users can upgrade, pay, and see their balance.

### Deliverables
- [ ] Drizzle schema: `subscriptions`, `credit_transactions`
- [ ] D1 migration for billing tables
- [ ] Stripe service (`src/server/services/billing.ts`)
- [ ] Stripe webhook handler (`/api/webhooks/stripe`)
  - `checkout.session.completed`
  - `customer.subscription.updated/deleted`
  - `invoice.payment_succeeded/failed`
- [ ] `billing` tRPC router:
  - `getSubscription`, `getBalance`, `getHistory`
  - `purchaseCredits`, `changePlan`, `cancelSubscription`
  - `getPortalUrl` (Stripe Customer Portal)
- [ ] `/dashboard/billing` — plan card + credit balance
- [ ] `/dashboard/billing/upgrade` — plan comparison table + Checkout redirect
- [ ] `/dashboard/billing/history` — payment history table
- [ ] Credit deduction/refund utility functions
- [ ] Low balance email trigger

---

## Phase 4: Invoice Management `phase-4-invoices`
**Status:** ✅ COMPLETED | **Effort:** ~1 week

### Objective
Invoices auto-created on payment, viewable in dashboard, downloadable as PDF, emailed to customer.

### Deliverables
- [ ] Drizzle schema: `invoices`, `invoice_items`
- [ ] D1 migration for invoice tables
- [ ] Invoice creation service (called from Stripe webhook)
- [ ] Invoice number sequencing logic
- [ ] `invoices` tRPC router:
  - `list` (paginated + filtered)
  - `getById`
  - `downloadPdf` (signed R2 URL)
  - `resendEmail`
  - `create` (manual)
- [ ] `/dashboard/invoices` — table with status badges, filters
- [ ] `/dashboard/invoices/:id` — full invoice view + actions
- [ ] Invoice PDF generation (HTML → stored in R2)
- [ ] Invoice email template (with PDF link)
- [ ] CSV export endpoint

---

## Phase 5: NFSe Integration `phase-5-nfse`
**Status:** ✅ COMPLETED | **Effort:** ~1 week

### Objective
Automated NFSe emission for every paid invoice. Company settings UI. Status tracking. Re-emission support.

### Deliverables
- [ ] Drizzle schema: `nfse_records`, `company_settings`
- [ ] D1 migration for NFSe tables
- [ ] Fiscal Nacional API client service
- [ ] Trigger.dev task: `nfse-generation` (with retry logic)
- [ ] NFSe emission trigger from invoice creation
- [ ] NFSe PDF + XML storage in R2
- [ ] `nfse` tRPC router:
  - `getStatus`, `reEmit`
  - `getSettings`, `updateSettings`
- [ ] `/dashboard/settings/company` — CNPJ, city, ISS settings
- [ ] NFSe status in invoice detail page
- [ ] NFSe issued email with PDF attachment
- [ ] Error handling + manual re-emission UI
- [ ] Trigger.dev task polling / realtime updates

---

## Phase 6: Email System `phase-6-email`
**Status:** Not Started | **Effort:** ~3-4 days

### Objective
All transactional emails working via Cloudflare Email Service. Email templates for all lifecycle events.

### Deliverables
- [ ] Cloudflare Email Service binding in `wrangler.jsonc`
- [ ] Email service abstraction (`src/server/services/email.ts`)
- [ ] Email templates (JSX → HTML):
  - `welcome.tsx`
  - `verify-email.tsx`
  - `reset-password.tsx`
  - `payment-receipt.tsx`
  - `invoice.ts`
  - `nfse-issued.tsx`
  - `low-balance-alert.tsx`
  - `subscription-changed.tsx`
- [ ] `/dashboard/settings/notifications` — notification preferences
- [ ] `settings` tRPC router: getNotifications, updateNotifications
- [ ] User settings DB schema + migration
- [ ] `cli-and-mcp.md` guidance applied: domain enabled via `wrangler email sending enable`
- [ ] DNS setup documentation (SPF/DKIM)

---

## Phase 7: API Keys & Production Readiness `phase-7-production`
**Status:** Not Started | **Effort:** ~1 week

### Objective
Boilerplate is production-deployable with monitoring, tests, and complete documentation.

### Deliverables
- [ ] `apiKeys` tRPC router:
  - `list`, `create`, `revoke`
  - Usage stats tracking
- [ ] `/dashboard/api-keys` — key management UI
- [ ] Sentry integration (Workers + React, source maps)
- [ ] PostHog analytics setup
- [ ] `observability` enabled in `wrangler.jsonc`
- [ ] Vitest setup with `@cloudflare/vitest-pool-workers`
- [ ] Test suite: auth flows, billing webhooks, NFSe job
- [ ] Cron job: cleanup expired sessions + stale records
- [ ] Environment docs: local → staging → production
- [ ] `scripts/setup.sh` — provision D1, KV, R2, Email
- [ ] Complete `README.md` with architecture diagram
- [ ] `CONTRIBUTING.md` for boilerplate contributors
- [ ] `docs/DEPLOYMENT.md` — step-by-step deploy guide
- [ ] `docs/NFSE_SETUP.md` — NFSe configuration guide

---

## Phase 8: i18n (Internationalization) `phase-8-i18n`
**Status:** Not Started | **Effort:** ~3-4 days | **Parallel with:** Phase 3+

### Objective
All UI strings translatable. Ship with English (en-US) and Brazilian Portuguese (pt-BR) as first-class locales. Typed `t()` function so missing keys are caught at compile time.

### Deliverables
- [ ] `i18next` + `react-i18next` + `i18next-browser-languagedetector` installed
- [ ] `i18next.config.ts` with namespaces: common, auth, dashboard, billing, invoices, nfse, errors
- [ ] `src/client/i18n/locales/en-US/` — JSON per namespace (source of truth)
- [ ] `src/client/i18n/locales/pt-BR/` — Brazilian Portuguese translations
- [ ] Typed `i18n.d.ts` for type-safe `t()` calls
- [ ] Language switcher component (EN / PT-BR) in dashboard header
- [ ] All auth + dashboard strings replaced with `t()` calls
- [ ] Currency/date locale formatters (Intl APIs)
- [ ] i18n scripts: `i18n:extract`, `i18n:sync`, `i18n:status`, `i18n:types`
- [ ] 100% coverage for both locales

---

## Phase 9: Staging Environment `phase-9-staging`
**Status:** Not Started | **Effort:** ~2-3 days | **Overlaps with:** Phase 1 (config) + Phase 7 (deploy)

### Objective
Full staging environment that mirrors production. Staging deploy works with a single command. Secrets managed via `upload-secrets.sh`. Dev scripts for WSL and Mac open all required services concurrently.

### Deliverables
- [ ] `env.staging` + `env.local` blocks in `wrangler.jsonc`
- [ ] Staging D1, KV (×2), R2 resources provisioned
- [ ] `scripts/provision-staging.sh` — one-shot resource creation
- [ ] `scripts/upload-secrets.sh` — bulk secret upload from `.env.staging` / `.env.production`
- [ ] `.env.staging.example` + `.env.production.example` — template files
- [ ] `scripts/dev-all-wsl.sh` — concurrent tabs: Vite + Wrangler + Trigger.dev + Stripe CLI
- [ ] `scripts/dev-all-mac.sh` — same for macOS
- [ ] `bun cf:deploy:staging` script working end-to-end
- [ ] Staging DB seeded with test data
- [ ] Staging Stripe sandbox + Fiscal Nacional sandbox configured
- [ ] Staging Trigger.dev tasks deployed
- [ ] `docs/STAGING.md` — verification checklist

---

## Future (Post-v1)

- [ ] Multi-tenant / organization accounts
- [ ] Team member management + RBAC
- [ ] Cloudflare Durable Objects for real-time features
- [ ] White-label theming
- [ ] i18n (pt-BR + en)
- [ ] Admin panel (super-admin view of all users)
- [ ] Advanced analytics dashboard
- [ ] Mobile-optimized PWA
