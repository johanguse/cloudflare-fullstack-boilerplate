# Cloudflare SaaS Boilerplate — Master TODO List

> Auto-sized by complexity: this is a **Large** project requiring all 4 phases of the spec-driven workflow.  
> Work through phases sequentially. Each phase has a clear deliverable gate before moving on.

---

## Phase 1: Foundation ✅ COMPLETED

### 1.1 Project Scaffold
- [x] `CF-001` Init git repo with `.gitignore` (node_modules, .wrangler, .dev.vars, dist)
- [x] `CF-002` Create `package.json` with all dependencies from llmgenerator stack
- [x] `CF-003` Install dependencies (`bun install`)
- [x] `CF-004` Create `tsconfig.json` (base) + `tsconfig.app.json` (client) + `tsconfig.worker.json`
- [x] `CF-005` Create `biome.json` (formatting: 2-space, double quotes, import sorting)
- [x] `CF-006` Create `wrangler.jsonc` with: name, compatibility_date, nodejs_compat, assets config
- [x] `CF-007` Add D1, KV (SESSION_KV, CACHE_KV), R2 (STORAGE), Email bindings to wrangler
- [x] `CF-008` Add staging + local environments to wrangler.jsonc
- [x] `CF-009` Create `drizzle.config.ts` pointing to local D1
- [x] `CF-010` Create `.dev.vars.example` listing all required secrets

### 1.2 Vite + Frontend Setup
- [x] `CF-011` Create `vite.config.ts` with `@cloudflare/vite-plugin` + `@tanstack/router-plugin`
- [x] `CF-012` Create `index.html` (SPA entry point)
- [x] `CF-013` Create `src/client/main.tsx` (React root + TanStack Router provider)
- [x] `CF-014` Create `src/client/index.css` (Tailwind v4 imports + CSS variables)
- [x] `CF-015` Create `src/client/routes/__root.tsx` (root layout with providers)
- [x] `CF-016` Create `src/client/routes/index.tsx` (landing page placeholder)
- [x] `CF-017` Create `components.json` (shadcn/ui New York style, slate base)
- [ ] `CF-018` Install initial shadcn components: button, input, label, card, form, dialog, dropdown-menu, avatar, badge, separator, tabs, skeleton, sonner
- [x] `CF-019` Create `src/client/lib/utils.ts` (cn() utility)
- [x] `CF-020` Create `tsr.config.json` (TanStack Router codegen config)

### 1.3 Database Schema
- [x] `CF-021` Create `src/server/db/schema/` folder
- [x] `CF-022` Create `src/server/db/schema/auth.ts` (Better Auth tables: users, sessions, accounts, verifications)
- [ ] `CF-023` Create `src/server/db/schema/api-keys.ts` (api_keys table) ← Phase 6
- [x] `CF-024` Create `src/server/db/index.ts` (Drizzle + D1 binding setup)
- [x] `CF-025` Run `bun db:generate` to create initial migration
- [x] `CF-026` Verify migration applies: `bun db:migrate`

### 1.4 Hono Server + Auth
- [x] `CF-027` Create `src/server/index.ts` (Hono app entry, mount routes, export default)
- [x] `CF-028` Create middleware files (CORS, auth, session)
- [x] `CF-029` Create `src/server/lib/auth.ts` (Better Auth instance with Drizzle adapter + KV)
- [x] `CF-030` Configure Better Auth: email/password, email OTP, Google OAuth, GitHub OAuth
- [x] `CF-031` Mount Better Auth handler on Hono: `app.on(['GET','POST'], '/api/auth/**', auth.handler)`
- [x] `CF-032` Create `src/server/lib/trpc.ts` (tRPC init + context factory)
- [x] `CF-033` Create `src/server/routers/index.ts` (root router, mount all sub-routers)
- [x] `CF-034` Create `src/server/routers/trpc/user.ts` (placeholder)
- [x] `CF-035` Mount tRPC on Hono at `/trpc`
- [x] `CF-036` Run `bun cf:typegen` to generate `worker-configuration.d.ts`

### 1.5 Dev Scripts
- [x] `CF-037` Create `scripts/dev-all-wsl.sh` (concurrent vite + wrangler dev)
- [x] `CF-038` Add all package.json scripts: dev, cf:dev, dev:all:wsl, build, cf:deploy, db:*, trigger:*, check, type-check, test
- [ ] `CF-039` Verify `bun dev` starts Vite at :5173 ← manual verify
- [ ] `CF-040` Verify `bun cf:dev` starts Worker at :8787 ← manual verify

**Phase 1 Gate:** ✅ `bun type-check` passes. `bun check` passes. Migration applied. Route tree generated.

---

## Phase 2: Auth Pages & Dashboard Shell ✅ COMPLETED

### 2.1 Auth Client + Routes
- [x] `CF-041` Create `src/client/lib/auth-client.ts` (Better Auth client with proper base URL)
- [x] `CF-042` Create `src/client/routes/(auth)/` folder with route group
- [x] `CF-043` Create `/login` page (email + password form + Google/GitHub OAuth buttons)
- [x] `CF-044` Create `/register` page (name + email + password with strength indicator)
- [x] `CF-045` Create `/verify-email` page (OTP input component)
- [x] `CF-046` Create `/forgot-password` page (direct fetch to `/api/auth/forget-password`)
- [x] `CF-047` Create `/reset-password` page (new password + confirm, with invalid token state)
- [x] `CF-048` Implement session check in `/` landing — redirects logged-in users to `/dashboard`
- [x] `CF-049` Create protected route guard (`beforeLoad` in protected layout)

### 2.2 Dashboard Layout
- [x] `CF-050` Create `src/client/routes/(protected)/` folder with layout
- [x] `CF-051` Create `src/client/components/layout/DashboardLayout.tsx` (sidebar + header)
- [x] `CF-052` Create `src/client/components/layout/AppSidebar.tsx` (collapsible, icon nav)
- [x] `CF-053` Create `src/client/components/layout/AppHeader.tsx` (breadcrumbs + user menu)
- [x] `CF-054` Copied 25 shadcn/ui components from boilerplate (sidebar, sheet, tooltip, scroll-area, etc.)
- [x] `CF-055` Create `src/client/components/layout/UserMenu.tsx` (avatar dropdown: profile, settings, logout)
- [x] `CF-056` Add theme toggle (ThemeProvider with CSS class + localStorage)
- [x] `CF-057` Create `src/client/components/layout/ThemeProvider.tsx`

### 2.3 Dashboard Pages
- [x] `CF-058` Create `/dashboard` overview (KPI cards with placeholder stats)
- [x] `CF-059` Create `/dashboard/profile` (name/email edit form with email verification badge)
- [x] `CF-060` Create `/dashboard/settings` (danger zone with tRPC delete account)
- [x] `CF-061` Wire Sonner toast provider in root layout

### 2.4 tRPC User Router
- [x] `CF-062` Implement `user.getProfile` procedure (queries D1 for user data)
- [x] `CF-063` Implement `user.updateProfile` procedure (name update with D1)
- [x] `CF-064` Implement `user.deleteAccount` procedure (deletes from D1 + confirmation dialog)
- [x] `CF-065` Create `src/client/lib/trpc-client.ts` (tRPC + TanStack Query setup)
- [x] `CF-066` Connect profile page to `user.getProfile` query
- [x] `CF-067` Connect profile form to `user.updateProfile` mutation

**Phase 2 Gate:** ✅ Full auth flow works (register → verify → login → dashboard). Dashboard shell renders with navigation. Profile page loads and saves.

---

## Phase 3: Billing & Subscriptions ✅ COMPLETED

### 3.1 Database Schema
- [x] `CF-068` Create `src/server/db/schema/billing.ts` (subscriptions, credit_transactions, credit_packages tables)
- [x] `CF-069` Generate + apply D1 migration for billing tables (`0001_overconfident_robbie_robertson.sql`)
- [x] `CF-070` Create credit utility functions in `src/server/services/credits.ts`: getBalance, addCredits, deductCredits, hasEnoughCredits

### 3.2 Stripe Service
- [x] `CF-071` Create `src/server/services/billing.ts` (Stripe client using fetch HTTP client for Workers)
- [x] `CF-072` Implement: createCustomer, createCheckoutSession, getSubscription, cancelSubscription, reactivateSubscription
- [x] `CF-073` Implement: createPortalSession, listInvoices, constructWebhookEvent
- [x] `CF-074` Add Stripe price IDs to `wrangler.jsonc` vars + `VITE_STRIPE_PRICE_*` env for frontend; `APP_URL` added

### 3.3 Stripe Webhook
- [x] `CF-075` Create `src/server/routers/rest/webhooks.ts` (registered at `/api/webhooks/stripe`)
- [x] `CF-076` Implement: `checkout.session.completed` → sync subscription + credit grant
- [x] `CF-077` Implement: `customer.subscription.updated` → update plan status + period
- [x] `CF-078` Implement: `customer.subscription.deleted` → downgrade to free
- [x] `CF-079` Implement: `invoice.payment_succeeded` → renewal credit grant
- [x] `CF-080` `invoice.payment_failed` — placeholder (email alert via Phase 6 email system)
- [x] `CF-081` Webhook signature verification with `STRIPE_WEBHOOK_SECRET` via `constructEventAsync`

### 3.4 Billing tRPC Router
- [x] `CF-082` Create `src/server/routers/trpc/billing.ts` (registered in appRouter)
- [x] `CF-083` Implement `billing.getSubscription` query (plan, status, balance, period)
- [x] `CF-084` Implement `billing.getBalance` query
- [x] `CF-085` Implement `billing.getHistory` query (paginated credit transactions)
- [x] `CF-086` Implement `billing.createCheckoutSession` mutation (→ Stripe Checkout)
- [x] `CF-087` Implement `billing.cancelSubscription` mutation
- [x] `CF-088` Implement `billing.getPortalUrl` mutation (→ Stripe Customer Portal)

### 3.5 Billing Pages
- [x] `CF-089` Create `/dashboard/billing` (plan card + credit balance with progress bar + recent transactions)
- [x] `CF-090` Create `/dashboard/billing/upgrade` (plan comparison grid with popular badge + CTA)
- [x] `CF-091` Create `/dashboard/billing/history` (paginated credit transaction table with badges)
- [x] `CF-092` Shadcn components used: table, progress, badge, alert-dialog (all already present)

**Phase 3 Gate:** ✅ Stripe checkout session creation works. Subscription + balance show in dashboard. Webhook updates plan in DB. Credit history table functional.

---

## Phase 4: Invoice Management ✅ COMPLETED

### 4.1 Database Schema
- [x] `CF-093` Create `src/server/db/schema/invoices.ts` (invoices, invoice_items tables)
- [x] `CF-094` Generate + apply D1 migration for invoice tables (`0002_normal_black_widow.sql`)
- [x] `CF-095` Create invoice number sequencing utility (year-based: YYYY-NNNN)

### 4.2 Invoice Service
- [x] `CF-096` Create `src/server/services/invoices.ts` (createFromStripe, generatePdf, etc.)
- [x] `CF-097` Implement invoice creation from Stripe invoice object
- [x] `CF-098` Implement HTML invoice generation (stored in R2, browser print-to-PDF)
- [x] `CF-099` Implement R2 storage + worker-served download endpoint
- [x] `CF-100` Invoice email template `src/server/emails/invoice.ts` (`renderInvoiceEmail`) ← Phase 6

### 4.3 Invoices tRPC Router
- [x] `CF-101` Create `src/server/routers/trpc/invoices.ts`
- [x] `CF-102` Implement `invoices.list` query (paginated, filter by status)
- [x] `CF-103` Implement `invoices.getById` query (with items)
- [x] `CF-104` Implement `invoices.downloadPdf` mutation (stores HTML in R2, returns worker URL)
- [x] `CF-105` Implement `invoices.resendEmail` mutation (placeholder, wired in Phase 6)
- [x] `CF-106` Implement `invoices.create` mutation (manual invoice creation)
- [x] `CF-106b` Implement `invoices.issue` mutation (draft → issued)
- [x] `CF-106c` Implement `invoices.cancel` mutation

### 4.4 Invoice Pages
- [x] `CF-107` Create `/dashboard/invoices` (table with: number, date, amount, status, actions + create dialog)
- [x] `CF-108` Create `/dashboard/invoices/$id` (full invoice view + download + resend + issue + cancel)
- [x] `CF-109` Invoice status badges: draft, issued, paid, cancelled, overdue
- [x] `CF-110` Status filter on invoice list
- [x] `CF-111` CSV export button → `GET /api/invoices/export`

### 4.5 Integration
- [x] `CF-111b` `invoice.payment_succeeded` webhook auto-creates invoice record from Stripe data
- [x] `CF-111c` `GET /api/invoices/:id/download` REST endpoint serves HTML from R2 or regenerates
- [x] Route tree regenerated — `invoices/$id` route properly registered

**Phase 4 Gate:** ✅ Payment generates invoice. Invoice visible in dashboard. PDF download works. Email resend stub works. CSV export works.

---

## Phase 5: NFSe Integration

### 5.1 Database Schema
- [x] `CF-112` Create `src/server/db/schema/nfse.ts` (nfse_records, company_settings tables)
- [x] `CF-113` Generate D1 migration `0003_smiling_kylun.sql` for NFSe tables
- [x] `CF-114` All required fields documented: CNPJ, inscrição municipal, city IBGE code, CNAE, ISS rate

### 5.2 Fiscal Nacional Service
- [x] `CF-115` Create `src/server/services/nfse.ts` (Fiscal Nacional API client)
- [x] `CF-116` Implement: `FiscalNacionalService.emitNfse()` → nfse record
- [x] `CF-117` Implement: `FiscalNacionalService.getNfseStatus()` → status + PDF URL
- [x] `CF-118` Implement: `FiscalNacionalService.cancelNfse()` → cancellation record
- [x] `CF-119` NFSe data mapper inside `internal.ts` POST /api/internal/nfse/emit

### 5.3 Trigger.dev Task
- [x] `CF-120` `trigger.config.ts` already in place
- [x] `CF-121` Create `trigger/nfse-generation.ts` task (fetch data → emit → poll status → store R2 → update DB)
- [x] `CF-122` Create `src/server/routers/rest/internal.ts` (Trigger.dev callback endpoints)
- [x] `CF-123` INTERNAL_API_KEY timing-safe auth on all internal routes
- [x] `CF-124` NFSe task triggered inside `invoice.payment_succeeded` via `executionCtx.waitUntil`

### 5.4 NFSe tRPC Router + Settings
- [x] `CF-125` Create `src/server/routers/trpc/nfse.ts` + mounted in `appRouter`
- [x] `CF-126` `nfse.getStatus` query (by invoice ID)
- [x] `CF-127` `nfse.reEmit` mutation (manual re-emission, creates new record)
- [x] `CF-128` `nfse.getSettings` + `nfse.updateSettings` (upsert company data)
- [x] `CF-129` Create `/dashboard/settings/company` page (full form with all fiscal fields)
- [x] `CF-130` NFSe status widget on invoice detail page (status badge, PDF/XML links, re-emit, cancel)
- [x] `CF-131` NFSe issued template `src/server/emails/nfse-issued.ts` + send on internal update (`issued`)

**Phase 5 Gate:** ✅ Payment → invoice → NFSe record created → Trigger.dev task queued → Fiscal Nacional API called → status polled → PDF/XML stored in R2 → DB updated. Company settings page live. Widget on invoice detail page.

---

## Phase 6: Email System ✅ COMPLETED

### 6.1 Cloudflare Email Service Setup
- [x] `CF-132` Add `send_email` binding to `wrangler.jsonc`
- [x] `CF-133` Create `src/server/services/email.ts` (sendEmail + transactional helpers)
- [x] `CF-134` Sends via Workers `EMAIL` binding; dev logs when no binding
- [x] `CF-135` Documented in `docs/EMAIL_SETUP.md` — `wrangler email sending enable yourdomain.com`
- [x] `CF-136` Create `docs/EMAIL_SETUP.md` (SPF/DKIM/DMARC DNS records guide)

### 6.2 Email Templates
- [x] `CF-137` Base layout: `src/server/emails/html-utils.ts` (`wrapEmailBody`, `escapeHtml`)
- [x] `CF-138` `welcome.ts` — `databaseHooks.user.create.after` (non-dev)
- [x] `CF-139` `verify-email.ts` — Better Auth `sendVerificationEmail`
- [x] `CF-140` `reset-password.ts` — `sendResetPassword`
- [x] `CF-141` `payment-receipt.ts` — Stripe `invoice.payment_succeeded` (owner, prefs)
- [x] `CF-142` `invoice.ts` — payment webhook + `invoices.resendEmail` (customer, prefs)
- [x] `CF-143` `nfse-issued.ts` — internal API when NFSe → `issued`
- [x] `CF-144` `low-balance-alert.ts` — `deductCredits(..., { env, config })` optional notify
- [x] `CF-145` `subscription-changed.ts` — Stripe subscription `updated` / `deleted` (prefs)
- [x] Sign-in OTP — `sendOtpEmail` in `email.ts`

### 6.3 API Keys Management
- [x] `CF-146` `src/server/routers/trpc/api-keys.ts` + `src/server/services/api-keys-crypto.ts`
- [x] `CF-147` `apiKeys.list`, `apiKeys.create`, `apiKeys.revoke`
- [x] `CF-148` SHA-256 via `crypto.subtle`; prefix stored; full key shown once
- [x] `CF-149` `/dashboard/api-keys` — table, create dialog, copy secret once

### 6.4 Notification Settings
- [x] `CF-150` `src/server/db/schema/settings.ts` — `user_notification_settings`, `api_keys`
- [x] `CF-151` Migration `0004_awesome_gamora.sql`
- [x] `CF-152` `src/server/routers/trpc/settings.ts` — `getNotifications`, `updateNotifications`
- [x] `CF-153` `/dashboard/settings/notifications` — toggles

**Phase 6 Gate:** ✅ Welcome, verify, reset, OTP emails outside dev. Receipt + invoice on paid Stripe invoice. NFSe issued notify. Subscription updates. Low-balance when deduct credits includes notify context. `ExecutionContext` passed into `app.fetch` for `waitUntil`.

---

## Phase 7: Production Readiness ✅ COMPLETED

### 7.1 Observability
- [x] `CF-154` Sentry Worker (`@sentry/cloudflare`, `withSentry` + `honoIntegration`, `SENTRY_DSN`)
- [x] `CF-155` Sentry React (`@sentry/react`, `VITE_SENTRY_DSN`, `ErrorBoundary`)
- [x] `CF-156` Sentry Vite plugin (`@sentry/vite-plugin` when `SENTRY_AUTH_TOKEN` + org + project set)
- [x] `CF-157` PostHog in `main.tsx` (`VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`)
- [x] `CF-158` `observability: { enabled: true }` in `wrangler.jsonc`
- [x] `CF-159` Cron: daily cleanup expired `verification` + `session` (`runScheduledCleanup`)

### 7.2 Testing
- [x] `CF-160` `vitest.config.ts` + `@cloudflare/vitest-pool-workers`
- [x] `CF-161` `test/fixtures/minimal-worker.ts`, `test/integration/*`
- [x] `CF-162` Auth-related: tRPC `protectedProcedure` rejects unauthenticated calls (user, billing); full E2E register/login deferred
- [ ] `CF-163` Stripe webhook integration tests (signature + happy paths) — follow-up with app harness or Stripe fixtures
- [x] `CF-164` NFSe: `FiscalNacionalService` construction / staging config (no network)
- [x] `CF-165` tRPC: user, billing, invoices, nfse — unauthorized guards

### 7.3 Deployment & Documentation
- [x] `CF-166` `scripts/setup.sh` (provision commands + next steps)
- [x] `CF-167` `docs/DEPLOYMENT.md`
- [x] `CF-168` `docs/NFSE_SETUP.md`
- [x] `CF-169` `docs/EMAIL_SETUP.md` (Phase 6)
- [x] `CF-170` `docs/STRIPE_SETUP.md`
- [x] `CF-171` `README.md` (architecture mermaid, links, scripts)
- [ ] `CF-172` Verify staging deploy: `bun cf:deploy:staging` (manual after real Cloudflare IDs/secrets)
- [x] `CF-173` `bun type-check` + `bun check` + `bun test:run` pass

**Phase 7 Gate:** Docs + observability + tests + cron in place. Staging deploy (`CF-172`) is manual per account.

---

## Phase 8: i18n (Internationalization)

> Can run **in parallel** with Phase 3+. Affects Phase 2 pages — add translation keys as auth/dashboard pages are built.

### 8.1 Setup
- [x] `CF-174` Add `i18next`, `react-i18next`, `i18next-browser-languagedetector` to `package.json`
- [x] `CF-175` Add `i18next-cli` as dev dependency (extract/sync/types)
- [ ] `CF-176` Create `i18next.config.ts` (namespaces: `common`, `auth`, `dashboard`, `billing`, `invoices`, `nfse`, `errors`)
- [ ] `CF-177` Create `src/client/i18n/index.ts` (i18n init: language detector, backend, fallback `en-US`)
- [ ] `CF-178` Create `src/client/i18n/locales/en-US/` — JSON files per namespace (source of truth)
- [ ] `CF-179` Create `src/client/i18n/locales/pt-BR/` — Brazilian Portuguese translations
- [ ] `CF-180` Add language type declarations (`src/client/i18n.d.ts`) — typed `t()` function
- [ ] `CF-181` Wire `I18nextProvider` in `src/client/main.tsx` (wrap before router)

### 8.2 Locale Content (en-US + pt-BR)
- [ ] `CF-182` `common.json` — nav labels, buttons (save, cancel, delete, edit), status labels, pagination
- [ ] `CF-183` `auth.json` — login, register, verify, forgot/reset password copy + validation messages
- [ ] `CF-184` `dashboard.json` — overview KPI labels, sidebar nav items, user menu
- [ ] `CF-185` `billing.json` — plan names, credit labels, payment status, checkout CTAs
- [ ] `CF-186` `invoices.json` — table headers, status badges, date/amount formatters
- [ ] `CF-187` `nfse.json` — NFSe status labels, company settings form, error messages
- [ ] `CF-188` `errors.json` — 401, 403, 404, 500 page copy

### 8.3 Component Integration
- [ ] `CF-189` Create `src/client/components/language-switcher.tsx` (dropdown: EN / PT-BR)
- [ ] `CF-190` Add language switcher to dashboard header (`AppHeader.tsx`)
- [ ] `CF-191` Replace all hardcoded strings in auth pages with `t()` calls
- [ ] `CF-192` Replace all hardcoded strings in dashboard shell (sidebar, header, user menu) with `t()` calls
- [ ] `CF-193` Add currency/date locale formatting utils (Intl.NumberFormat, Intl.DateTimeFormat based on i18n language)
- [ ] `CF-194` Persist selected language in localStorage + cookie (for SSR-safe future)

### 8.4 Tooling
- [x] `CF-195` Add `i18n:extract` script — `i18next-cli extract` scans source for missing keys
- [x] `CF-196` Add `i18n:sync` script — sync all locale files to match source namespace structure
- [x] `CF-197` Add `i18n:status` script — show translation coverage per locale
- [x] `CF-198` Add `i18n:types` script — regenerate typed `t()` declarations

**Phase 8 Gate:** All auth + dashboard strings translated in both en-US and pt-BR. Language switch works at runtime. `i18n:status` shows 100% coverage for both locales.

---

## Phase 9: Staging Environment

> Staging tasks span Phase 1 (wrangler config) through Phase 7 (deploy verification). Group here for clarity.

### 9.1 Wrangler Staging Config ✅ Done in Phase 1
- [x] `CF-199` Add full `env.staging` block to `wrangler.jsonc`
- [x] `CF-200` Add `env.local` block to `wrangler.jsonc`
- [x] `CF-201` Create `.dev.vars.example` listing all secrets with empty values + descriptions
- [ ] `CF-202` Create `.dev.vars` (gitignored) from `.dev.vars.example` for local dev ← manual step

### 9.2 Staging Resources Provisioning
- [ ] `CF-203` Create `scripts/provision-staging.sh` — run once to create all Cloudflare resources
- [ ] `CF-204` Update `wrangler.jsonc` IDs after provisioning
- [ ] `CF-205` Run `bun db:migrate:staging` — apply all D1 migrations to staging database
- [ ] `CF-206` Create `src/server/db/seeds/seed-staging.sql` — minimal seed data for staging

### 9.3 Secrets Management
- [x] `CF-207` Create `scripts/upload-secrets.sh`
- [x] `CF-208` Create `.env.staging.example` — all required secrets with empty values
- [x] `CF-209` Create `.env.production.example` — all required secrets with empty values
- [ ] `CF-210` Document Stripe sandbox credentials for staging
- [ ] `CF-211` Document Fiscal Nacional staging API key
- [ ] `CF-212` Upload all staging secrets: `bash scripts/upload-secrets.sh staging`

### 9.4 Build & Deploy Scripts ✅ Done in Phase 1
- [x] `CF-213` Add `build:staging` script
- [x] `CF-214` Add `cf:deploy:staging` script
- [x] `CF-215` Add `db:seed:staging` script
- [x] `CF-216` Add `db:studio:staging` script
- [x] `CF-217` Add `trigger:deploy:staging` script
- [ ] `CF-218` Add `stripe:listen:staging` script for Stripe CLI webhook forwarding ← manual step

### 9.5 Dev-All Scripts ✅ Done in Phase 1
- [x] `CF-219` Create `scripts/dev-all-wsl.sh`
- [x] `CF-220` Create `scripts/dev-all-mac.sh`
- [ ] `CF-221` Add first-run guard: build `dist/client` if missing before starting wrangler dev

### 9.6 Staging Verification
- [ ] `CF-222` Deploy to staging: `bun cf:deploy:staging`
- [ ] `CF-223` Verify staging auth flow (register → verify email → login)
- [ ] `CF-224` Verify staging Stripe checkout (test mode payment)
- [ ] `CF-225` Verify staging NFSe emission (Fiscal Nacional sandbox)
- [ ] `CF-226` Verify staging email delivery (Cloudflare Email Service staging domain)
- [ ] `CF-227` Create `docs/STAGING.md` — checklist for staging verification + common issues

**Phase 9 Gate:** `bun cf:deploy:staging` succeeds. Auth, billing, NFSe, and email all work in staging. Staging secrets uploaded. `docs/STAGING.md` complete.

---

## Summary by Phase

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Foundation | CF-001 → CF-040 | ✅ Complete |
| 2. Auth & Dashboard | CF-041 → CF-067 | ✅ Complete |
| 3. Billing | CF-068 → CF-092 | ✅ Complete |
| 4. Invoices | CF-093 → CF-111 | ✅ Complete |
| 5. NFSe | CF-112 → CF-131 | ✅ Complete |
| 6. Email | CF-132 → CF-153 | ✅ Complete |
| 7. Production | CF-154 → CF-173 | ✅ Complete (CF-163/172 follow-ups) |
| 8. i18n | CF-174 → CF-198 | ⏳ Pending (parallel with Phase 3+) |
| 9. Staging Env | CF-199 → CF-227 | 🔶 Partial (config done, provisioning pending) |

**Total tasks: 227**
