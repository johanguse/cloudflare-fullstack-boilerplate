# Stripe setup

Billing uses **Stripe Checkout** (subscriptions), **Customer Portal**, and **webhooks** processed by the Worker at `POST /api/v1/webhooks/stripe`.

## 1. Create a Stripe account

Use [Stripe Dashboard](https://dashboard.stripe.com). For staging, stay in **Test mode**.

## 2. Products and prices

1. Create one **Product** per plan (e.g. Starter, Professional, Business, Agency).
2. For each product, create **recurring prices** (monthly and optional annual).
3. Copy each **Price ID** (`price_...`) into `wrangler.jsonc` under `vars`:

   - `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`, …
   - `STRIPE_PRICE_*_ANNUAL` if you offer yearly billing.

4. Optionally set `STRIPE_PRODUCT_*` to Stripe **Product IDs** (`prod_...`) if your code references them.

The app maps subscriptions to internal plan IDs using these env vars (see billing schema `plans`).

## 3. API keys

- **Secret key:** `STRIPE_API_KEY` (`sk_test_...` or `sk_live_...`).
- Put via Wrangler:

```bash
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_API_KEY --env staging
```

## 4. Webhook endpoint

1. In Stripe → **Developers → Webhooks**, **Add endpoint**.
2. URL:
   - Production: `https://api.yourdomain.com/api/v1/webhooks/stripe` (or your chosen API host + path).
   - Local: use Stripe CLI (see below).
3. Events to send (minimum set used by the boilerplate — add more if you extend handlers):

   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - (Add others your `webhooks.ts` handles.)

4. Copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`:

```bash
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
```

## 5. Local development

Forward webhooks to Wrangler dev (default `8787`):

```bash
bun run stripe:listen
# forwards to http://localhost:8787/api/v1/webhooks/stripe
```

Use the CLI signing secret in `.dev.vars` while developing.

## 6. API version

`STRIPE_API_VERSION` in `wrangler.jsonc` should match the version configured in your Stripe Dashboard **Developers → API version**. Update in lockstep with `stripe` npm package major releases if you bump the API version.

## 7. Customer Portal (optional)

If you expose “Manage billing”, ensure the **Customer portal** is enabled in Stripe and return URLs match `APP_URL` / auth session origins.

## 8. Testing

- Use [Stripe test cards](https://docs.stripe.com/testing).
- Confirm credits/subscription rows update in D1 after `checkout.session.completed` and that invoices/NFSe hooks run if enabled.
