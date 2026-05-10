# Email setup (Cloudflare Email Service)

Transactional mail uses the Workers [`send_email`](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/) binding (`EMAIL` in `wrangler.jsonc`). No third-party API key is required for basic sending once DNS and routing are configured.

## 1. Enable outbound sending for your domain

From your project directory (replace with your production domain):

```bash
wrangler email sending enable yourdomain.com
```

Follow the prompts to verify domain ownership and enable the sending address you use in `FROM_EMAIL` (for example `no-reply@yourdomain.com`).

## 2. DNS: SPF, DKIM, DMARC

- **SPF**: Cloudflare usually publishes/updates SPF when you enable Email Routing / sending for the zone. Confirm a TXT record at the apex (or delegated subdomain) that authorizes Cloudflare to send on behalf of your domain.

- **DKIM**: After enabling sending, Cloudflare provides DKIM records in the dashboard (Email → Email Routing → [your domain] → DNS records). Add the CNAME/TXT records exactly as shown.

- **DMARC** (recommended): Add a TXT record at `_dmarc.yourdomain.com`, for example:

  ```text
  v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
  ```

  Start with `p=none` to collect reports, then move toward `quarantine` or `reject` once traffic looks good.

Use [MXToolbox](https://mxtoolbox.com/) or Cloudflare’s DNS tools to validate SPF/DKIM/DMARC after propagation (often 15 minutes–48 hours).

## 3. Worker binding

`wrangler.jsonc` should include:

```jsonc
"send_email": [{ "name": "EMAIL" }]
```

Top-level `vars.FROM_EMAIL` must match an allowed sender identity for that domain (see `worker-configuration.d.ts` / `createAppConfig`).

Local dev (`env.local`) may omit `send_email`; the app logs skipped sends when `EMAIL` is missing.

## 4. Secrets and staging

- Staging should use a real subdomain (for example `staging.yourdomain.com`) or a separate verified domain if you need real delivery in non-production.

- Never commit API secrets; production secrets remain in `wrangler secret put` / Secret Store as documented in the main README.

## 5. Resend (optional)

`package.json` includes `resend` for optional integration. This boilerplate’s default path is the Cloudflare binding in `src/server/services/email.ts`.
