# Security, Reliability, Concurrency, A11y & UI Audit

_Audit date: 2026-07-11 · Branch: `feat/onboarding-tour`_

This document tracks findings from a full-stack audit (security, reliability,
concurrency, accessibility, UI consistency) and their remediation status.

Legend: ✅ fixed · 🟡 partial · ⬜ open

---

## Scope and method

This review covered the Cloudflare Worker entry point and middleware, tRPC and
REST routes, database schema and migrations, billing/credits/invoice services,
and the affected dashboard and authentication screens. Findings were derived
from source review, data-flow tracing across the client, Worker, D1, Stripe,
and NFSe boundaries, plus static validation where the workspace permits it.

Status means the remediation is present in the current worktree; it does not
replace production verification of external providers, migrations, or browser
assistive-technology behaviour.

---

## Critical

| ID | Status | Finding | Location |
|----|--------|---------|----------|
| C-1 | ✅ | Credit balance lost-update race → double-spend | `services/credits.ts` `deductCredits` |
| C-2 | ✅ | Stripe webhook not idempotent → duplicate credit grants / NFSe | `routers/rest/webhooks.ts` |
| C-3 | ✅ | `subscriptions.user_id` missing UNIQUE index but upserted via `onConflictDoUpdate` | `db/schema/billing.ts` + migration |

## High

| ID | Status | Finding | Location |
|----|--------|---------|----------|
| H-1 | ✅ | API-key "pause"/"disable" was client-only cosmetic state | `routes/(protected)/dashboard/api-keys.tsx` |
| H-2 | ✅ | Turnstile CAPTCHA collected but never verified server-side | `lib/auth.ts` |
| H-3 | ✅ | `createCheckoutSession` accepts arbitrary `priceId` (no allowlist) | `routers/trpc/billing.ts` |
| H-4 | ✅ | Unescaped user input rendered as `text/html` (stored XSS) | `services/invoices.ts` `generateInvoiceHtml` |
| H-5 | ✅ | Account deletion leaves Stripe billing active / no re-auth | `routers/trpc/user.ts` |

## Medium

| ID | Status | Finding | Location |
|----|--------|---------|----------|
| M-1 | ✅ | No effective Content-Security-Policy | `server/index.ts` |
| M-2 | ✅ | CSV formula injection in invoice export | `services/invoices.ts` `invoicesToCsv` |
| M-3 | ✅ | `nfse.reEmit` no idempotency / paid / already-issued guard | `routers/trpc/nfse.ts` |
| M-4 | ✅ | CORS falls back to wildcard with credentials | `middlewares/corsMiddleware.ts` |
| M-5 | ✅ | Weak server-side password policy | `lib/auth.ts` |
| M-6 | ✅ | Invoice download via `window.open` after async mutation | `routes/(protected)/dashboard/invoices/index.tsx` |
| M-7 | ✅ | Duplicate Stripe customers / subscription rows in checkout | `routers/trpc/billing.ts` |

## Low / A11y / Visual

| ID | Status | Finding |
|----|--------|---------|
| L-1 | ✅ | `retry: 1` retries 4xx (auth) errors |
| L-3 | ✅ | Admin `updateUserRole` can demote the last admin / self |
| L-4 | ✅ | API-key row "copy" copied a useless `prefix...` value |
| L-5 | ✅ | Delete-account confirm didn't show a pending state |
| L-6 | ✅ | Sequential invoice numbering via `COUNT(*)` race (retry-on-conflict) |
| A-1 | ✅ | Icon-only controls without accessible names |
| A-2 | ✅ | Fake non-functional "sort" buttons in api-keys headers |
| A-3 | ✅ | No skip-to-content link / focusable main landmark |
| A-4 | ✅ | Pagination buttons missing `aria-current` / labels |
| V-1 | 🟡 | Agency plan added to upgrade page; plan metadata still duplicated client/server |

## Still open (tracked, lower priority)

- **V-3** — date/number locales remain mixed in a few invoice/admin views. A
  shared locale-aware formatter now covers the dashboard, billing, sidebar,
  settings, and plan comparison; migrate the remaining domain-specific helpers.

Additionally fixed in this pass: **L-2** (admin route now shows a spinner instead
of a blank flash) and **A-6** (Turnstile `onError` now surfaces a message and
resets the token instead of silently leaving submit disabled).
- **A-5** is also fixed: comparison-table booleans and email-verification icons
  now expose text alternatives to assistive technology.
- **A-7** is also fixed: authentication failures now appear in persistent inline
  `role="alert"` messages as well as toast notifications.
- **V-2** is also fixed: API keys, activity logs, and invoices now use the same
  compact paginator, including page-state and accessible navigation labels.
- Pre-existing (unrelated): `services/billing.ts` pins Stripe
  `apiVersion: "2026-05-27.dahlia"` but generated types expect `2026-06-24.dahlia`.

---

## Notes on deferred items

- **H-5** — Stripe subscription is cancelled and sessions are revoked before
  account deletion. The request now also requires the current password, unless
  the session was created in the preceding 15 minutes. Preserving issued
  invoices / NFSe (removing `ON DELETE CASCADE` on financial tables and
  switching to soft-delete/anonymization) is an architectural change tracked
  separately; tax records should not be hard-deleted.
- **C-3** — Requires `bun db:migrate:*` to be run against each environment. A
  new migration adds the unique index; de-duplicate any existing rows first.

---

## Release checklist

Before deploying these changes:

- Apply migration `0004_safe_leper_queen.sql` in local, staging, and production.
  Resolve any duplicate `subscriptions.user_id` rows before creating the unique
  index.
- Configure the production Turnstile secret and confirm that the server-side
  verification endpoint is reachable from the Worker.
- Confirm the configured Stripe price IDs match the intended products in each
  Stripe environment, then exercise checkout, a repeated webhook delivery, and
  an account deletion against test-mode data.
- Confirm CSP and CORS headers from a deployed Worker, including the dashboard,
  API, and Stripe webhook routes.
- Decide the retention policy for issued invoices and NFSe before changing the
  remaining financial-record deletion behaviour described in H-5.

## Verification performed

| Check | Result | Notes |
|----|----|----|
| `git diff --check` | Passed | No whitespace errors in the current diff. |
| `bun run check` | Passed with existing warnings | Formatting now passes. Biome still warns about two pre-existing non-null assertions in `drizzle.config.ts`. |
| `bunx tsc -b` | Blocked by existing type mismatch | `services/billing.ts` pins Stripe API version `2026-05-27.dahlia`, while generated Stripe types require `2026-06-24.dahlia`. |
| `bun run test` | Not completed in this environment | Vitest/esbuild repeatedly failed to create Node worker threads (`uv_thread_create` assertion) before tests could report results. Re-run where normal process/thread limits are available. |

The static blockers above are not changes made by this audit pass, but they
should be resolved before treating the branch as release-ready.
