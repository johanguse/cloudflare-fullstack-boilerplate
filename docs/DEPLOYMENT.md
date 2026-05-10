# Deployment guide

Step-by-step deploy for **production** and **staging** on Cloudflare Workers (API + SPA assets).

## Prerequisites

- Cloudflare account and `wrangler login`
- Stripe account (products/prices created — see [STRIPE_SETUP.md](./STRIPE_SETUP.md))
- Optional: [Sentry](https://sentry.io) project for Workers + React, [PostHog](https://posthog.com) project for product analytics
- Optional: Fiscal Nacional API key for NFSe — see [NFSE_SETUP.md](./NFSE_SETUP.md)

## 1. Provision resources

From the repo root:

```bash
chmod +x scripts/setup.sh
bash scripts/setup.sh
```

Paste returned **database IDs** and **KV namespace IDs** into `wrangler.jsonc` for the default (production) block and `env.staging`.

## 2. D1 migrations

**Local**

```bash
bun db:migrate
```

**Staging (remote D1)**

```bash
bun db:migrate:staging
```

**Production**

```bash
bun db:migrate:prod
```

## 3. Secrets

- **Local:** copy `.dev.vars.example` → `.dev.vars` and fill values (never commit).
- **Staging/production:** put secrets with Wrangler:

```bash
bash scripts/upload-secrets.sh staging
# production: edit the script env or use wrangler secret put NAME without --env staging
```

See `.dev.vars.example` for the full list (`BETTER_AUTH_SECRET`, Stripe, `FISCAL_NACIONAL_API_KEY`, `TRIGGER_API_KEY`, `INTERNAL_API_KEY`, optional `SENTRY_DSN`).

## 4. Non-secret config

In `wrangler.jsonc`, set:

- `routes` / custom domains for your zone
- `vars.APP_URL`, `BETTER_AUTH_URL`, `TRUSTED_ORIGINS`
- Stripe product and price IDs (`STRIPE_PRODUCT_*`, `STRIPE_PRICE_*`)

## 5. Client environment (Vite)

For Sentry browser and PostHog, set at **build time** (e.g. in CI or a root `.env` file used by Vite):

| Variable | Purpose |
|----------|---------|
| `VITE_SENTRY_DSN` | Browser errors (optional) |
| `VITE_POSTHOG_KEY` | PostHog project API key (optional) |
| `VITE_POSTHOG_HOST` | Default `https://us.i.posthog.com` (EU: `https://eu.i.posthog.com`) |

`CLOUDFLARE_ENVIRONMENT` is set by `build:staging` / `build:production` scripts.

## 6. Sentry source maps (optional)

In CI or locally when releasing:

```bash
export SENTRY_AUTH_TOKEN=...
export SENTRY_ORG=your-org
export SENTRY_PROJECT=your-project
bun run build:production
```

The Vite plugin uploads source maps when those variables are present.

## 7. Build and deploy

**Staging**

```bash
bun run cf:deploy:staging
```

**Production**

```bash
bun run cf:deploy
```

## 8. Trigger.dev

Deploy tasks after API is up:

```bash
bun run trigger:deploy
# or staging:
bun run trigger:deploy:staging
```

## 9. Verification checklist

- Open app URL → login/register works
- `/api/v1/health` returns `ok`
- Stripe webhook receives events (Stripe CLI or dashboard)
- Optional: send a test email after enabling Cloudflare Email for your domain

## 10. Cron

Workers cron is configured in `wrangler.jsonc` (`0 6 * * *` UTC). The handler deletes expired Better Auth `verification` and `session` rows.

## Troubleshooting

- **Empty Worker or 500 on first deploy:** ensure `dist/client` exists — deploy scripts run `build` first.
- **OAuth redirects wrong:** `BETTER_AUTH_URL` must match the origin users hit (see dual dev server note in README).
- **tRPC 404 on api.* domain:** by design, tRPC is app-origin only in production; REST is on the API host.
