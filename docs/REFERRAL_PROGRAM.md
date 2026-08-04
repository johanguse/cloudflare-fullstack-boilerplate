# Referral Program — Status & TODO

A native "Give 50 credits, get 50 credits" referral module integrated with the
existing Better Auth signup flow, Stripe webhooks, and the credit ledger. Design
reference: [better-auth-referral](https://github.com/marinedotsh/better-auth-referral).

## Reward rules (current)

- **Referrer:** 50 credits (`REFERRER_REWARD_CREDITS`)
- **New customer:** 50 credits (`REFERRED_REWARD_CREDITS`)
- **Qualification:** only on the referred user's **first successful subscription
  payment** (`checkout.session.completed`, `mode: subscription`). No reward for
  signup alone.
- **Monthly cap:** 20 rewarded referrals per referrer per calendar month
  (`REFERRAL_MONTHLY_REWARD_CAP`).
- All constants live in [`src/shared/referral.ts`](../src/shared/referral.ts).

## What's implemented

- **Schema** — `referral_codes`, `referrals`, `referral_rewards`
  ([`src/server/db/schema/referral.ts`](../src/server/db/schema/referral.ts)),
  migration `0005_amusing_phantom_reporter.sql`. Added `referral` to the
  `credit_transactions` type enum.
- **Service** — [`src/server/services/referral.ts`](../src/server/services/referral.ts):
  code generation/customization, attribution, idempotent reward pipeline with
  self-referral / duplicate-payment-identity / monthly-cap checks, dashboard +
  list queries, email masking.
- **Attribution** — `/r/:code` server route sets a 30-day cookie
  ([`src/server/index.ts`](../src/server/index.ts)); Better Auth
  `user.create.after` hook reads it and records attribution (works for email
  **and** OAuth signup) ([`src/server/lib/auth.ts`](../src/server/lib/auth.ts)).
- **Reward issuance** — wired into the Stripe `checkout.session.completed`
  handler ([`src/server/routers/rest/webhooks.ts`](../src/server/routers/rest/webhooks.ts)),
  runs in `waitUntil`. `paymentIdentity` = normalized billing email.
- **API** — `referral` tRPC router (`getDashboard`, `updateSlug`, `list`)
  ([`src/server/routers/trpc/referral.ts`](../src/server/routers/trpc/referral.ts)).
- **UI** — referrals page, dashboard CTA banner + quick action, sidebar nav
  link, register-page "you were invited" hint.
- **i18n** — `en`, `pt-BR`, `es` keys added.
- **Tests** — pure-logic unit tests
  ([`test/integration/referral-service.spec.ts`](../test/integration/referral-service.spec.ts)).

## Still missing / TODO

### Verification (blocked in this environment)
- [ ] **Run the test suite** — `bun run test` was blocked by a local esbuild
      service crash (resource exhaustion), not a code failure. Re-run once the
      machine is healthy: `bunx vitest run test/integration/referral-service.spec.ts`.
- [ ] **Apply the migration locally** — `bun run db:migrate:local` and click
      through the flow (`/r/<code>` → register → subscribe → check both balances).
- [ ] `bunx tsc -b` is clean except a **pre-existing** unrelated Stripe API
      version error in `src/server/services/billing.ts` (not from this feature).

### Correctness / hardening
- [ ] **Payment-identity strength.** Duplicate detection currently keys on the
      normalized billing email. Consider upgrading to the Stripe **card
      fingerprint** (`payment_method.card.fingerprint`) for stronger anti-abuse,
      or hashing the identity before storing rather than keeping the raw email.
- [ ] **Reward atomicity.** The reward record insert, referral status update, and
      the two `addCredits` calls are sequential (not one transaction). The unique
      `referral_id` makes it idempotent, but a mid-way failure could leave a
      reward row without both credit grants. Consider wrapping in a single
      transaction or a reconciliation job.
- [ ] **Renewal vs. first payment.** Reward keys off `checkout.session.completed`.
      Confirm this never fires for plan changes/upgrades in a way that would
      re-qualify (currently guarded because the referral flips to `rewarded`).
- [ ] **Referrer notification.** No email/toast when a referral qualifies. Add a
      `sendReferralRewardEmail` (mirror `notification-prefs` opt-in pattern).
- [ ] **Rejected-referral visibility.** `rejected` referrals (cap/duplicate) show
      in the list as "Not eligible" but there's no reason tooltip or admin view.

### Product / UX
- [ ] **Admin surface.** No admin view of referral activity, top referrers, or
      manual reward reversal. Consider adding to the `admin` router/pages.
- [ ] **Fraud monitoring.** No alerting on unusual referral velocity per
      referrer/IP beyond the monthly cap.
- [ ] **Landing page for `/r/:code`.** Currently redirects straight to
      `/register`. A branded "You've been invited by …" splash could lift
      conversion (would require exposing referrer display name safely).
- [ ] **Share affordances.** Add copy-to-clipboard social share buttons
      (X/WhatsApp/email) on the referrals page.
- [ ] **Self-serve config.** Reward amounts and cap are hardcoded constants;
      move to env/config if they need to change without a deploy.

### Docs / ops
- [ ] Document the program in user-facing help/marketing.
- [ ] Add a note to `STRIPE_SETUP.md` that `checkout.session.completed` must
      include `customer_details.email` (it does by default) for reward attribution.
- [ ] Backfill: existing users have no `referral_codes` row until first dashboard
      visit (created lazily) — fine, but note it for analytics.
