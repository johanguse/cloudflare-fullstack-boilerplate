# Authentication remediation progress — 2026-10-25

This is the implementation follow-up for batches 1–3. The original run-1 files
and `findings.json` describe the older source snapshot, not the current worktree.
These changes are **implemented, awaiting runtime validation**, not closed audit
findings. No deployed environment, remote database, seed account, or secret was
read or changed during this work.

| Leads | Source change | Remaining proof |
|---|---|---|
| N7 | Auth initialization rejects missing, short, example and public-default signing secrets. | Verify each environment supplies its private secret without exposing the value. |
| N10 | Staging seed requires distinct operator-supplied passwords; uses fresh Better Auth hashes; rotates existing seed credential rows and deletes their D1 sessions; no password output. Credential account IDs now match Better Auth's user-ID lookup. | Owner checks existing staging accounts, rotates or removes them, and confirms old credentials and cookies fail. The seed was not run here. |
| N1 | Removed KV secondary storage. Verification records are explicitly D1-backed; the installed SQLite adapter consumes records using `DELETE ... RETURNING`. OTPs are hashed. | Run concurrent consume/replay and three-attempt-budget regression tests against workerd D1. |
| N4, N5 | Rate limiting is explicitly enabled, keyed by `CF-Connecting-IP`, and uses one conditional D1 UPSERT per admission. Denied requests do not extend expiry. Five email requests per recipient per 15-minute window are shared across send routes and IPs. Persisted keys are HMACs, not raw email/IP values. Cron removes expired counters. | Verify concurrent admission, window reset, trusted IP behavior, and recipient limits. CF's production ingress must supply the trusted header. No Gmail-dot or plus-address alias folding is applied. |
| N3 | Correct reset-request URL in the client and captcha list; protect signup, verification, OTP senders, OTP reset-request aliases and email-change requests. Add Turnstile to the verification-code page. Missing captcha configuration fails closed outside explicit local development. | Run missing-token HTTP checks and owner-driven browser flows with configured staging Turnstile. No external captcha provider was called. |
| N2 | Enable `revokeSessionsOnPasswordReset` and disable cookie session caching. | Verify link and OTP resets reject cookies from both existing devices. |
| N14 | Account deletion uses Better Auth's `internalAdapter.deleteUser`, including session/account cleanup; errors propagate instead of being swallowed. Sessions use D1, with cookie caching disabled. | Verify deletion through the actual router and replay both device cookies. |

## Rollout behavior

1. Apply `0006_auth_rate_limits.sql` before deploying the Worker. Existing session
   and verification tables are reused; the new table stores only rate counters.
2. Configure a private random `BETTER_AUTH_SECRET` of at least 32 characters and
   `TURNSTILE_SECRET_KEY` in staging/production. Configure the corresponding
   `VITE_TURNSTILE_SITE_KEY` for the client. Initialization fails if required
   server configuration is absent.
3. Switching from KV to D1 signs out existing KV-backed sessions, ignores old
   session-cache cookies, and invalidates outstanding KV verification/reset
   tokens. Users must sign in again and request new tokens. Old KV entries are
   no longer an auth authority; they can expire naturally. The KV binding is
   retained to avoid unrelated infrastructure changes.
4. D1 is now read for session validation. This intentionally removes the former
   five-minute revocation delay and increases D1 traffic.
5. Existing staging seed accounts remain unchanged until the owner rotates or
   deletes them. For rotation, supply `STAGING_SEED_PASSWORDS` through a protected
   environment mechanism, then run `bun db:seed:staging`. It must be a JSON object
   with a different private 20–128 character password for each of:
   `admin@example.com`, `user@example.com`, `pro@example.com`,
   `business@example.com`, `agency@example.com`. Do not put password values in
   shell history, checked-in files, logs, or this document. The seed's temporary
   SQL uses a private directory and file mode `0600`, and is removed in `finally`.

## Verification status

- Added `test/integration/auth-security.spec.ts` using the actual migrations,
  workerd D1, production auth factory, auth HTTP routes, and account-delete router.
  It includes concurrent counters/verification, expiry, captcha, recipient
  budgets, password-reset revocation and old cached-cookie replay.
- Static Biome checks and `git diff --check` pass. Tests, type checking and builds
  have **not** been executed for this change.
- The security-audit skill requires target execution inside an OS-enforced
  sandbox with no external network, an allowlisted environment, read-only source
  and toolchain, scratch-only writes, and resource limits. The Docker daemon is
  unavailable on this host; a compliant runtime was not established. The current
  test and build results from the earlier dependency upgrade do not validate
  this patch.
- Before deployment, run the focused test, the complete suite, TypeScript and
  the production build in a compliant sandbox with installed dependencies and
  dummy bindings. Perform the owner checks above, then reconcile each affected
  finding and its evidence against the deployed revision.

## Still outside this batch

N6 (tRPC development errors), N8 (invoice email budgets), N9 (NFSe concurrency),
N11 (referral atomicity), N12 (webhook recovery), and N13 (subscription ownership)
remain open. The broader release/configuration hardening notes also remain open.

References: [Better Auth sessions](https://better-auth.com/docs/concepts/session-management),
[captcha](https://better-auth.com/docs/plugins/captcha),
[email/password](https://better-auth.com/docs/authentication/email-password), and
[Cloudflare KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/#consistency).
