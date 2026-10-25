# Needs validation: cloudflare-fullstack-boilerplate (run-1)

> **Current implementation status:** [AUTH-REMEDIATION.md](AUTH-REMEDIATION.md)
> tracks local changes for N1–N5, N7, N10 and N14. The original source traces
> below describe run-1 and must be revalidated before closure.

These 14 records are source-grounded boundary hypotheses. Each is blocked on a fact that this source-only run could not observe. They have no severity. They are ordered by fingerprint.

## N1. Email OTP and reset attempt cap relies on non-atomic KV and a rate limiter that may default to off

- **Fingerprint:** `auth/email-otp-attempt-budget-kv-nonatomic-ratelimit-default-off`
- **Claimed root cause:** auth.ts leaves rateLimit.enabled to the library default, which depends on NODE_ENV. It also uses a KV-backed secondaryStorage whose getAndDelete is non-atomic, so the library's consume-and-recreate attempt counter is not enforced under concurrency.

With secondaryStorage and no verification.storeInDatabase, email OTP and reset values live only in SESSION_KV. The library's consumeVerificationValue calls the app's secondaryStorage.getAndDelete, which is a KV get followed by a delete. atomicVerifyOTP then re-creates the record with usedAttempts+1 after each wrong guess. Concurrent guesses that read the record before the delete lands can each see the same usedAttempts value. That would let more than the allowed 3 guesses per OTP be tested. The Better Auth rate limiter, including the 3 per 60s rules on the email-otp routes, is enabled only when rateLimit.enabled is set or the module-load value of NODE_ENV is 'production'. The app sets neither, and wrangler.jsonc sets ENVIRONMENT but not NODE_ENV. If the deployed Worker does not expose NODE_ENV=production through process.env, no request throttling applies to the OTP routes, sign-in or reset. A 6-digit OTP lasts 600s, so the two weaknesses together make online guessing of a victim's OTP more feasible than the intended 3 attempts. The affected routes are email-otp/reset-password, email-otp/verify-email and sign-in/email-otp. The OTP-based sign-in and password reset on these routes can lead to account takeover.

### Trace

1. **entrypoint** `src/server/index.ts:119` (`app.on(['POST','GET'], '/api/auth/*')`): Anonymous request to /api/auth/email-otp/reset-password, /email-otp/verify-email or /sign-in/email-otp reaches the Better Auth handler.
2. **propagation** `src/server/lib/auth.ts:179` (`betterAuth rateLimit`): rateLimit sets storage, window and max but no enabled flag. The library computes enabled as options.rateLimit?.enabled ?? isProduction (create-context.mjs:172). isProduction is fixed at module load from env.NODE_ENV (env-impl.mjs:32). wrangler.jsonc sets ENVIRONMENT but no NODE_ENV.
3. **propagation** `src/server/lib/auth.ts:96` (`secondaryStorage.getAndDelete`): Reads the key from KV, then deletes it. This is not atomic. internal-adapter.mjs:818-820 uses it for consumeVerificationValue when storeInDatabase is unset.
4. **sink** `src/server/lib/auth.ts:168` (`emailOTP({ expiresIn: 600 })`): atomicVerifyOTP (plugins/email-otp/routes.mjs:770-790) consumes the value, then on a wrong guess re-creates it with usedAttempts+1. Parallel requests that read before the delete all observe the earlier count, so the 3-attempt budget can be exceeded.

### Evidence

- `src/server/lib/auth.ts:179`: rateLimit config has no enabled flag.
- `src/server/lib/auth.ts:103`: A comment concedes that KV has no atomic counter and that concurrent hits can under-count.
- `src/server/lib/auth.ts:96`: getAndDelete is implemented as a KV get followed by a delete, with a comment calling it best effort.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Whether process.env.NODE_ENV is 'production' in the deployed Worker is not source-visible, because wrangler.jsonc does not set it
- The degree of KV get/delete racing under parallel requests, given KV eventual consistency and request colocation, is not source-observable

### Validation plan

- **Local (sandboxed):** In an approved sandbox, run the Worker under the local Workers runtime with a dummy KV and dummy user, ENVIRONMENT=production and no NODE_ENV. Request an OTP, then fire about 50 concurrent POST /api/auth/email-otp/reset-password requests with distinct wrong OTPs. Count how many are evaluated (INVALID_OTP) before TOO_MANY_ATTEMPTS, and whether any 429 is returned.
- **Owner check (deployment):** Owner check on staging only: temporarily log process.env.NODE_ENV in the Worker, or send more than 10 sign-in requests in 60s with dummy credentials and see whether a 429 appears. Fix: set rateLimit.enabled: true explicitly, set verification.storeInDatabase: true so OTP and attempt state is DB-backed, and use a Durable Object or D1 for atomic rate-limit counters.

## N2. Password reset (link and email OTP) leaves existing sessions valid

- **Fingerprint:** `auth/password-reset-does-not-revoke-sessions`
- **Claimed root cause:** revokeSessionsOnPasswordReset is left at its default (false) in the emailAndPassword config, so resetCredentialPassword never revokes existing sessions.

emailAndPassword.revokeSessionsOnPasswordReset is not set in src/server/lib/auth.ts. The link reset (api/routes/password.mjs:160) and the email-OTP reset (plugins/email-otp/routes.mjs:596) both call resetCredentialPassword. The phone-number reset route does too, but the phoneNumber plugin is not enabled in this app. That helper calls deleteUserSessions only when the option is truthy. No other code path in better-auth dist references the option. In source, sessions issued before a reset therefore remain valid after the owner resets the password. A session stolen earlier, or held by an attacker who already compromised the account, would survive the recovery. The 5-minute cookieCache (auth.ts:190-193) can extend acceptance of already-issued cookies after any later revocation. This is the library default, so it is a hardening-level candidate rather than a clear defect. The runtime behaviour was not observed.

### Trace

1. **entrypoint** `src/server/lib/auth.ts:52` (`emailAndPassword config`): The password reset flow is enabled in this block, which does not set revokeSessionsOnPasswordReset.
2. **propagation** `src/server/lib/auth.ts:57` (`sendResetPassword`): A reset link is emailed. The reset endpoint then runs resetCredentialPassword, as does the emailOTP reset route.
3. **sink** `node_modules/better-auth/dist/utils/password.mjs:34` (`resetCredentialPassword`): deleteUserSessions is guarded by options.emailAndPassword.revokeSessionsOnPasswordReset, so with the option unset the existing sessions are left in place.

### Evidence

- `src/server/lib/auth.ts:52`: The emailAndPassword block (lines 52-66) has no revokeSessionsOnPasswordReset setting.
- `node_modules/better-auth/dist/utils/password.mjs:34`: The library revokes sessions only when the option is truthy. A grep of better-auth dist finds no other reference to the option.
- `node_modules/better-auth/dist/plugins/email-otp/routes.mjs:596`: The email-OTP reset calls the same resetCredentialPassword helper.
- `node_modules/better-auth/dist/api/routes/password.mjs:160`: The link-token reset calls the same resetCredentialPassword helper.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Observed runtime session behaviour after reset not tested

### Validation plan

- **Local (sandboxed):** In a sandbox, create a dummy user with two sessions and complete a reset-password with a valid token. Then call /api/auth/get-session with the pre-reset cookies, using the disableCookieCache query flag to bypass the 5-minute cookieCache, and confirm they are still accepted. Set revokeSessionsOnPasswordReset: true and repeat to confirm they are rejected.
- **Owner check (deployment):** Owner check on staging with dummy accounts using the same steps. Do not use real user data.

## N3. Turnstile captcha endpoint list names a nonexistent route and omits the real email-sending routes

- **Fingerprint:** `better-auth-captcha-endpoint-list-misses-real-email-routes`
- **Claimed root cause:** The captcha endpoints array was written against an older better-auth route name (/forget-password) and does not cover /request-password-reset, /send-verification-email or the email-otp routes. Because an explicit list replaces the library defaults, which include /request-password-reset, those routes lose captcha protection. The remaining control on these senders is the per-IP rate limiter.

The captcha plugin is configured with an explicit endpoint list that includes /forget-password, which does not exist in better-auth 1.7.12 (the route is /request-password-reset). The plugin matches paths by exact equality, or by wildcard only when the configured entry contains '*'. When TURNSTILE_SECRET_KEY is set, anonymous callers can therefore reach /api/auth/request-password-reset, /api/auth/send-verification-email and the /email-otp/* senders without any Turnstile token. Each can trigger a transactional email to a caller-chosen address on the operator's Cloudflare Email binding, and the password-reset and verification senders only send to existing users. Correction to the hunter's wording: the forgot-password page does send an x-captcha-response header at line 57, but it posts to the nonexistent /api/auth/forget-password, so the UI flow is likely broken (404). Browser clients are therefore not the issue. The gap is that direct API callers skip the captcha on the real routes. Impact is limited to email-spend and reputation abuse bounded by the per-IP rate limiter. Whether that limiter is active, and whether Turnstile is enabled at all, depends on deployment.

### Trace

1. **entrypoint** `src/server/lib/auth.ts:33` (`captcha({ endpoints })`): The endpoint list contains /sign-in/email, /sign-up/email, /forget-password and /reset-password. It omits /request-password-reset, /send-verification-email and every /email-otp/* route. The list is only active when TURNSTILE_SECRET_KEY is set.
2. **propagation** `node_modules/better-auth/dist/plugins/captcha/index.mjs:29` (`captcha.onRequest`): onRequest (starts at line 23) returns without a captcha check when the normalized pathname does not equal a configured endpoint. Wildcard matching applies only to entries containing '*'.
3. **propagation** `node_modules/better-auth/dist/api/routes/password.mjs:20` (`requestPasswordReset`): The real reset-request route is /request-password-reset. It calls sendResetPassword for an existing user.
4. **sink** `src/server/lib/auth.ts:170` (`emailOTP.sendVerificationOTP / sendResetPassword`): The senders call sendOtpEmail, sendPasswordResetEmail or sendVerifyEmailLink, which call env.EMAIL.send to the supplied address.

### Evidence

- `src/server/lib/auth.ts:33`: The explicit endpoints list replaces the library defaults.
- `node_modules/better-auth/dist/plugins/captcha/constants.mjs:12`: The library defaults include /request-password-reset, confirming the real route name.
- `node_modules/better-auth/dist/plugins/email-otp/routes.mjs:75`: /email-otp/send-verification-otp sends an OTP for type sign-in when sign-up is not disabled (line 103).
- `node_modules/better-auth/dist/api/routes/email-verification.mjs:38`: /send-verification-email is a real route that is not in the captcha list.
- `src/client/routes/(auth)/forgot-password.tsx:53`: The UI posts to /api/auth/forget-password, which is not a route in 1.7.12. It does send an x-captcha-response header at line 57, contrary to the hunter's claim.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Whether TURNSTILE_SECRET_KEY is set in the deployed environment, whether the rate limiter is enabled in production, and whether Cloudflare Email sending limits or rate rules apply are not visible in the repository

### Validation plan

- **Local (sandboxed):** In a sandboxed fixture with a dummy TURNSTILE_SECRET_KEY and a mock EMAIL binding, call createAuth(...).handler with POST /api/auth/request-password-reset, /api/auth/send-verification-email and /api/auth/email-otp/send-verification-otp, all without x-captcha-response. Expect a non-400 response and a mock EMAIL.send call. POST /api/auth/sign-in/email without the header should return 400 MISSING_RESPONSE, and POST /api/auth/forget-password should return 404.
- **Owner check (deployment):** Owner check in staging with Turnstile enabled: send an anonymous request without x-captcha-response to /api/auth/request-password-reset for an owned test account and observe whether the reset email is delivered. Also confirm the rate limiter state and the Email binding quotas.

## N4. KV rate-limit counter loses its TTL after the second hit, so rate-limit keys never expire

- **Fingerprint:** `better-auth-kv-increment-drops-ttl-permanent-ratelimit-lockout`
- **Claimed root cause:** src/server/lib/auth.ts increment() passes `expirationTtl: current ? undefined : ttl`, so the key expiration is dropped on every update after the first. Better Auth's secondary-storage consume() has no timestamp-based reset and relies on the store expiring the key at the end of the window.

The custom secondaryStorage.increment used for Better Auth rate limiting passes expirationTtl only when the key does not yet exist (`current ? undefined : ttl`). Every later hit calls SESSION_KV.put without a TTL. A Workers KV put replaces the whole entry, so the expiration from the first hit would very likely be dropped. The counter would then persist and keep growing. Better Auth 1.7.12 allows a request only while increment(key, window) <= rule.max. It has no other window reset on this path: the secondary-storage branch does not compare timestamps and relies on the store expiring the key. Once the count passes max (3 for the sign-in, sign-up, change-password, change-email, forget-password and email-otp send paths, 10 elsewhere), every later request for that `<ip>|<path>` key would get 429 until an operator deletes the key. Auth.ts sets no advanced.ipAddress options, so the client IP comes from x-forwarded-for with no trustedProxies. getIPFromHeader returns null unless the header holds exactly one valid IP, and getIP then returns null outside dev/test. The key then becomes the shared `no-trusted-ip|<path>`. An anonymous attacker who sends their own X-Forwarded-For value could produce a multi-value header (Cloudflare appends the client IP) and exhaust that shared bucket with about 4 requests. That would lock out every client whose XFF is not a single valid IP. The attacker cannot target a chosen victim IP. The source side is verified. The TTL-drop semantics of KV, the deployed NODE_ENV/rateLimit.enabled value, and the XFF seen at the Worker are runtime facts that cannot be checked from source.

### Trace

1. **entrypoint** `src/server/index.ts:119` (`app.on(["POST","GET"], "/api/auth/*")`): Anonymous requests reach authInstance.handler(c.req.raw), which runs Better Auth's request-phase rate limit before route handling. The earlier /api/auth/* middleware at line 112 only blocks the API domain.
2. **propagation** `src/server/lib/auth.ts:179` (`rateLimit config`): rateLimit sets storage to secondary-storage, window 60 and max 10, and sets no advanced.ipAddress options. Better Auth's special rules lower max to 3 for the sign-in, sign-up, change-password, change-email, forget-password and email-otp send routes. The key is `${ip}|${path}` (createRateLimitKey), with the IP from the default x-forwarded-for header. A multi-value header with no trustedProxies yields null, which leads to the shared `no-trusted-ip` bucket.
3. **sink** `src/server/lib/auth.ts:106` (`secondaryStorage.increment`): SESSION_KV.put(key, String(next), { expirationTtl: current ? undefined : ttl }) is called at lines 106-108. On the second and later hits no TTL is supplied, so the key may become non-expiring and the count only grows. Requests are then allowed only while count <= max.

### Evidence

- `src/server/lib/auth.ts:103`: increment reads the current value, adds 1 and writes it back. expirationTtl is `current ? undefined : ttl` (line 107), so the TTL applies only when the key did not previously exist.
- `node_modules/better-auth/dist/api/rate-limiter/index.mjs:204`: In the secondary-storage consume() (starting at line 199), the request is allowed iff `increment(key, ttlFor(rule.window)) <= rule.max`. There is no lastRequest comparison or other reset on this path, unlike the memory and database backends, which compare lastRequest to the window.
- `node_modules/@better-auth/core/dist/utils/ip.mjs:174`: getIPFromHeader (line 174) returns null when the header has more than one value and no trustedProxies are set. getIP (line 203) defaults to the x-forwarded-for header and returns null outside dev/test (localhost fallback at line 217 applies only in test/dev), which produces the shared `no-trusted-ip` key.
- `node_modules/better-auth/dist/context/create-context.mjs:172`: rateLimit.enabled defaults to isProduction (NODE_ENV). auth.ts does not set enabled, so the limiter is active only when production is detected at runtime.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Workers KV overwrite semantics (a put without expirationTtl clears the existing expiration) and the deployed NODE_ENV (rateLimit.enabled defaults to NODE_ENV === production) are runtime facts not visible in source
- The exact x-forwarded-for value Cloudflare passes to the Worker when the client supplies its own XFF header is a deployment topology fact not visible in source

### Validation plan

- **Local (sandboxed):** In an isolated sandbox with miniflare or wrangler dev --local, a dummy KV namespace and no network, call the increment function directly, or POST a dummy /api/auth/sign-in/email four times with the same X-Forwarded-For. After the second hit, read the key's metadata through the dummy namespace and check whether an expiration is still set. Advance a faked clock past 60s (or 10s for sign-in) and check whether the next request still returns 429. Repeat with a two-value X-Forwarded-For and observe the shared `no-trusted-ip|/sign-in/email` key.
- **Owner check (deployment):** On staging, with a test IP and a non-production dummy account, send two requests to /api/auth/sign-in/email. List the SESSION_KV keys matching `|/sign-in/email` and check whether the key has an expiration. Confirm that NODE_ENV=production is inlined in the Worker bundle (rateLimit enabled) and what Cloudflare sends in x-forwarded-for when the client supplies its own. The fix is to pass expirationTtl: ttl on every put (or store {count, resetAt} and compare), and to set advanced.ipAddress.ipAddressHeaders to ['cf-connecting-ip'].

## N5. Rate limiter on anonymous email-sending routes may be disabled by an unset NODE_ENV, mis-scoped by IP resolution, and has no per-recipient budget (KV increment TTL loss overlaps a sibling candidate)

- **Fingerprint:** `better-auth-ratelimit-enabled-depends-on-unset-node-env-and-ip-path-key-no-recipient-budget`
- **Claimed root cause:** Rate-limit enablement depends on an unset NODE_ENV rather than the app's ENVIRONMENT flag, the budget key is IP|path only with the IP source not pinned (no ipAddressHeaders or trustedProxies), and there is no per-recipient accounting. The KV increment TTL loss is a separate root cause tracked by the sibling fingerprint.

The only throttle on the anonymous Better Auth email-sending routes is the secondary-storage rate limiter in src/server/lib/auth.ts. Re-reading the source shows two distinct accounting gaps in this record, plus one overlapping concern tracked elsewhere. (A) rateLimit.enabled is not set. create-context.mjs defaults it to isProduction, and the core env module computes isProduction only from env.NODE_ENV === 'production', evaluated once at module load. wrangler.jsonc defines ENVIRONMENT (production, staging, development) but no NODE_ENV. vite.config.ts defines only process.env.CLOUDFLARE_ENVIRONMENT and import.meta.env.VITE_ENVIRONMENT, not NODE_ENV. Under nodejs_compat the deployed value of process.env.NODE_ENV, and whether the bundler inlines it, cannot be determined from source. If it is not 'production', the limiter is off and the anonymous email routes are unthrottled. (A overlaps in subject with auth/email-otp-attempt-budget-kv-nonatomic-ratelimit-default-off.) (B) The bucket key is `${ip ?? 'no-trusted-ip'}|${path}`. getIP reads only x-forwarded-for by default, because no advanced.ipAddress.ipAddressHeaders or trustedProxies is configured. A multi-value x-forwarded-for returns null and falls into one shared per-path bucket. Each path then has one global budget, which is a denial-of-service lever against legitimate users of that path. There is no per-recipient dimension, so email bombing a victim from rotating IPs is bounded only by IP count. The library special rule is 3 per 60s on /request-password-reset, /send-verification-email, /forget-password* , /email-otp/send-verification-otp and /email-otp/request-password-reset. (C) The custom increment() passes expirationTtl only when no prior value exists, so a re-put may clear the KV expiry. This is the same root cause as the sibling candidate better-auth-kv-increment-drops-ttl-permanent-ratelimit-lockout and is counted there, not here. This record's distinct findings are A and B. Because KV re-put semantics and the deployed NODE_ENV and x-forwarded-for were not observed in this run, none of these claims is confirmed.

### Trace

1. **entrypoint** `src/server/lib/auth.ts:179` (`rateLimit config`): storage secondary-storage, window 60, max 10, with no enabled flag and no advanced.ipAddress configuration. Reachable by anonymous requests to /api/auth/*.
2. **propagation** `node_modules/better-auth/dist/context/create-context.mjs:172` (`rateLimit.enabled`): enabled: options.rateLimit?.enabled ?? isProduction, where isProduction is imported from @better-auth/core/env.
3. **propagation** `node_modules/better-auth/dist/api/rate-limiter/index.mjs:248` (`resolveRateLimitConfig`): The key is built from getIP(...) ?? 'no-trusted-ip' plus the path. Special rules (getDefaultSpecialRules, around lines 306-318) set 3 per 60s on the email paths. There is no recipient-based dimension.
4. **sink** `src/server/lib/auth.ts:103` (`secondaryStorage.increment`): The KV counter is read, incremented and re-put with expirationTtl only when no prior value exists (line 107). This is the overlapping TTL-loss concern, tracked in the sibling candidate and not part of this record's claimed root cause.

### Evidence

- `node_modules/@better-auth/core/dist/env/env-impl.mjs:32`: isProduction = nodeENV === 'production', where nodeENV = env.NODE_ENV ?? '' is computed once at module load (line 30). Nothing else feeds it.
- `node_modules/@better-auth/core/dist/utils/ip.mjs:196`: DEFAULT_IP_HEADERS = ['x-forwarded-for']. getIP returns null when the header has more than one entry and no trustedProxies are set (line 190).
- `src/server/lib/config.ts:14`: The app's own ENVIRONMENT flag drives isDevelopment (unset is treated as development), but it is not passed to Better Auth's rateLimit.enabled.
- `src/server/lib/auth.ts:107`: expirationTtl: current ? undefined : ttl, the increment TTL-loss pattern (overlaps the sibling fingerprint).
- `vite.config.ts:53`: define block sets only process.env.CLOUDFLARE_ENVIRONMENT and import.meta.env.VITE_ENVIRONMENT. It does not inline process.env.NODE_ENV.
- `node_modules/better-auth/dist/api/rate-limiter/index.mjs:314`: The 3-per-60s special rule (matcher on line 314, window 60 on line 316) covers the password-reset, verification and email-OTP send paths, so the configured max of 10 does not apply to them.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Deployed value of process.env.NODE_ENV inside the Worker (under nodejs_compat, and whether the bundler inlines it) must be observed, not inferred, because it decides whether rateLimit.enabled is true
- Cloudflare's actual x-forwarded-for content for inbound requests (single vs multi-value) must be observed to decide whether requests collapse into the shared 'no-trusted-ip' bucket
- Workers KV expiration semantics on a put without expirationTtl (TTL-loss part) must be observed; it is tracked under the sibling fingerprint

### Validation plan

- **Local (sandboxed):** In a sandbox with enforceable limits: instantiate the auth handler with a Map-backed fake SESSION_KV and call POST /api/auth/request-password-reset five times with one x-forwarded-for. Run once with NODE_ENV=production and confirm the 4th request returns 429. Run again with NODE_ENV unset and confirm no 429 is ever returned. Repeat with x-forwarded-for set to 'a, b' and confirm the key becomes 'no-trusted-ip|/request-password-reset' and is shared across different clients.
- **Owner check (deployment):** Owner check on the owner's own staging or production. The owner temporarily logs process.env.NODE_ENV from a Worker route to see whether it is 'production'. The owner sends 5 password-reset requests for an account they own from one IP and confirms a 429 on the 4th. The owner logs the x-forwarded-for header seen by the Worker to see whether it is single or multi-value. The owner inspects the SESSION_KV key `<ip>|/request-password-reset` for a missing expiration (this covers the sibling TTL issue). The auditor sends no traffic to any deployment.

## N6. tRPC isDev default may expose stack traces in production error responses

- **Fingerprint:** `config.trpc-isdev-stack-disclosure`
- **Claimed root cause:** Reliance on the process.env.NODE_ENV default for tRPC isDev in a Workers runtime where NODE_ENV may be unset or not statically replaced, instead of tying isDev to the app's ENVIRONMENT setting.

initTRPC is created without an isDev override. tRPC defaults isDev to process.env.NODE_ENV !== 'production', and the error shape adds data.stack when isDev is true and the error has a string stack. src/server/lib/trpc.ts passes no isDev, and vite.config.ts defines only process.env.CLOUDFLARE_ENVIRONMENT and import.meta.env.VITE_ENVIRONMENT, not NODE_ENV. Whether the deployed Worker bundle has NODE_ENV statically replaced is not decidable from source. Vite normally replaces it in production builds, but wrangler.jsonc enables nodejs_compat, where process.env.NODE_ENV could be unset at runtime and so not equal 'production'. Impact if it applies: any caller who triggers a server-side error through /trpc/* (for example a handler throwing an unexpected error) could see data.stack with bundled paths. TRPCError thrown by the auth middleware, such as UNAUTHORIZED, would also carry a stack field. Low severity information disclosure.

### Trace

1. **entrypoint** `src/server/lib/trpc.ts:6` (`initTRPC.context<tRPCContext>().create()`): tRPC is initialised with no isDev option, so the library default applies to every /trpc/* procedure.
2. **propagation** `node_modules/@trpc/server/dist/initTRPC-B259os3T.mjs:311` (`isDev default`): isDev falls back to globalThis.process?.env['NODE_ENV'] !== 'production' when opts.isDev is not supplied.
3. **sink** `node_modules/@trpc/server/dist/getErrorShape-B0JBUs-i.mjs:202` (`getErrorShape`): When config.isDev is true and error.stack is a string, shape.data.stack is set and returned in the JSON error response.

### Evidence

- `src/server/lib/trpc.ts:6`: create() is called with no isDev or errorFormatter.
- `vite.config.ts:52`: The define block sets CLOUDFLARE_ENVIRONMENT and VITE_ENVIRONMENT only. There is no explicit NODE_ENV replacement, so the outcome depends on Vite and the Cloudflare plugin defaults.
- `wrangler.jsonc:6`: nodejs_compat is enabled, so a process.env object exists at runtime and NODE_ENV may be undefined.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)

### Validation plan

- **Local (sandboxed):** In a throwaway checkout, build with the production configuration and grep the built worker output for the isDev expression, and check whether process.env.NODE_ENV was replaced by 'production'. Then, against a local worker started with the production-equivalent build, call a protected procedure unauthenticated and inspect the JSON error for data.stack.
- **Owner check (deployment):** Owner-observed: send an unauthenticated request to a protected tRPC procedure on the deployed Worker and check whether the error JSON contains data.stack. A fix that removes the uncertainty is to pass isDev explicitly, for example isDev: false or a value derived from ENVIRONMENT, to initTRPC.create().

## N7. Missing BETTER_AUTH_SECRET falls back to Better Auth's public default signing secret

- **Fingerprint:** `crypto.better-auth-default-secret-failopen`
- **Claimed root cause:** Fail-open secret handling. auth.ts uses an empty-string fallback, and the library falls back to a public default secret. Its production guard depends on NODE_ENV, which may be unset in workerd.

createAuth passes env.BETTER_AUTH_SECRET ?? "" to Better Auth. If the secret is unset or empty, Better Auth resolves it as options.secret || env.BETTER_AUTH_SECRET || env.AUTH_SECRET || "" and then substitutes the hard-coded default 'better-auth-secret-12345678901234567890'. validateSecret throws on the default secret only when isProduction is true. isProduction is computed once from NODE_ENV === 'production'. Workers deployments often leave NODE_ENV unset, and nodejs_compat does not set it (wrangler.jsonc defines no NODE_ENV var), so the guard may not fire. In that case session and other secret-derived tokens would be signed with a publicly known key, which would allow forgery. Whether the secret is actually set in the deployed environments, and what NODE_ENV resolves to under workerd, are deployment facts that source alone cannot settle. The repo does treat the secret as required: it is typed as a required string, listed in scripts/upload-secrets.sh and in .dev.vars.example, and documented in wrangler.jsonc.

### Trace

1. **entrypoint** `src/server/lib/auth.ts:48` (`createAuth betterAuth config`): secret: env.BETTER_AUTH_SECRET ?? "" is passed to betterAuth() when the auth instance is created.
2. **propagation** `node_modules/better-auth/dist/context/create-context.mjs:79` (`createAuthContext secret resolution`): A falsy legacySecret (line 71) resolves to the literal default 'better-auth-secret-12345678901234567890'.
3. **sink** `node_modules/better-auth/dist/context/create-context.mjs:42` (`validateSecret`): The throw on the default secret requires isProduction, so with NODE_ENV unset the default is accepted and used as the signing and encryption secret.

### Evidence

- `src/server/lib/auth.ts:48`: Empty-string fallback for the secret.
- `node_modules/@better-auth/core/dist/env/env-impl.mjs:32`: isProduction is derived only from nodeENV === 'production'; nodeENV comes from env.NODE_ENV ?? "" (line 30), where env is a proxy over globalThis.process.env (lines 3-6). In workerd this holds only what nodejs_compat populates, and wrangler.jsonc defines no NODE_ENV, so it may be unset.
- `node_modules/better-auth/dist/context/create-context.mjs:71`: legacySecret = options.secret || env.BETTER_AUTH_SECRET || env.AUTH_SECRET || "". The library env proxy reads globalThis.process.env, which nodejs_compat may populate with bindings. Either way, an unset secret reaches the default fallback at line 79.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Deployment fact outside the source: whether BETTER_AUTH_SECRET is set for staging and production, and what NODE_ENV resolves to under workerd with nodejs_compat.

### Validation plan

- **Local (sandboxed):** In a throwaway checkout inside an approved sandbox, run the worker with .dev.vars lacking BETTER_AUTH_SECRET and NODE_ENV unset. Sign in as a dummy user, then check that the session cookie signature validates against HMAC with the public default secret and that a cookie forged with that secret is accepted. Run a second case with NODE_ENV=production and confirm that startup throws.
- **Owner check (deployment):** Owner-observed and non-destructive: run wrangler secret list for the production and staging environments to confirm BETTER_AUTH_SECRET exists, and check what process.env.NODE_ENV resolves to under workerd with nodejs_compat. Do not print the secret values.

## N8. Authenticated users can send unlimited branded invoice emails to arbitrary third-party addresses

- **Fingerprint:** `invoices.resendEmail/unbounded-email-to-arbitrary-recipient`
- **Claimed root cause:** resendEmail sends to the user-supplied invoice.customerEmail with no recipient ownership or consent check and no send-frequency or quota control. Only the session userId and the sender's own notification preference gate it.

Any signed-in user can create invoices with an arbitrary syntactically valid customerEmail through invoices.create. They can then call invoices.resendEmail repeatedly. The server sends the app-branded invoice email from the configured From address to that third party. Source shows no per-user, per-invoice or per-recipient throttle and no recipient verification. The only gate is the sender's own notifyInvoice preference. The email carries an attacker-chosen amount and currency, plus the system-generated invoice number and a link into the app. The impact is limited to unsolicited-mail abuse and the reputation and quota cost to the operator's sending identity. Free-form text is not attacker-controlled, so phishing value is small. In this run the severity depends on Cloudflare Email Service limits and destination restrictions, which are not visible in the repository. Send errors are swallowed and the router always returns queued:true.

### Trace

1. **entrypoint** `src/server/routers/trpc/invoices.ts:177` (`invoicesRouter.create`): A protectedProcedure that accepts any z.string().email() as customerEmail, with no limit on the number of invoices.
2. **propagation** `src/server/routers/trpc/invoices.ts:130` (`invoicesRouter.resendEmail`): An owner-scoped invoice lookup, then only the notifyInvoice preference check (lines 148-154), then sendInvoiceNotificationEmail to invoice.customerEmail at line 158. There is no rate limit, cooldown or counter.
3. **sink** `src/server/services/email.ts:48` (`sendEmail`): env.EMAIL.send({from: config.fromEmail, to, ...}) with no accounting. Failures are caught at line 56 and returned as {ok:false}, which the router ignores before returning queued:true. The sink was previously cited at line 44, which is the missing-binding branch. The send call itself is at line 48.

### Evidence

- `src/server/routers/trpc/invoices.ts:148`: The only gate before the send is the sender's own notification preference (notifyInvoice).
- `src/server/lib/trpc.ts:11`: protectedProcedure checks only for a session. There is no rate-limit middleware.
- `src/server/index.ts:129`: The /trpc/* Hono middleware only does API-domain gating and builds the context. It adds no rate limit. A repo-wide grep for rateLimit or cooldown in src/server finds only the Better Auth limiter in lib/auth.ts.
- `src/server/services/email.ts:180`: sendInvoiceNotificationEmail builds the email from the invoice number, the amount label and a frontend link, and sends it to the arbitrary recipient.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Cloudflare Email Service sending limits and destination restrictions for the deployed account are not visible in the repository
- Whether the production deployment sets a stricter account-level or edge rate limit on /trpc is not visible

### Validation plan

- **Local (sandboxed):** In an approved sandbox with a mocked EMAIL binding and config.isDevelopment=false, create one invoice with customerEmail=victim@example.test using a dummy user. Call invoices.resendEmail N times (e.g. 50) and assert that the mock send is invoked N times with to=victim@example.test and no throttle error.
- **Owner check (deployment):** The owner checks the Cloudflare Email Service sending limits and destination-verification mode for the production sender. They also check whether any WAF or rate-limit rule covers /trpc/invoices.resendEmail, and what happens to delivery reputation after repeated sends to unverified addresses.

## N9. NFSe emission guard is a non-atomic check-then-insert, so concurrent reEmit calls can issue duplicate fiscal documents

- **Fingerprint:** `nfse/reemit-check-then-insert-no-unique-invoice-record`
- **Claimed root cause:** The 'only one live NFSe per invoice' invariant is enforced by an application-level read followed by a write, with no DB uniqueness and no conditional insert. Idempotency is delegated to an external API that is not verified.

nfse.reEmit and the invoice.payment_succeeded webhook both SELECT the invoice's NFSe records, then INSERT a new pending record and start NFSE_WORKFLOW. The nfse_records table has no unique or partial-unique index on invoice_id. An authenticated owner of a paid invoice can send two concurrent reEmit mutations. Both can pass the blocking check, both insert, and two Workflows each call the Fiscal API emitNfse with the same external_reference (invoice-<id>). The workflow's 'emit nfse' step also re-runs emitNfse if the DB update after it throws. Whether duplicate real fiscal documents result depends on the Fiscal API treating a repeated external_reference idempotently, which is not visible in the repo. The only principal affected is the invoice owner, and only through their own invoice. A webhook-versus-reEmit race is only possible if the owner calls reEmit while the webhook is still queuing.

### Trace

1. **entrypoint** `src/server/routers/trpc/nfse.ts:42` (`nfseRouter.reEmit`): protectedProcedure. It loads an invoice filtered by invoiceId and ctx.session.userId, and requires status 'paid' and FISCAL_NACIONAL_API_KEY.
2. **propagation** `src/server/routers/trpc/nfse.ts:72` (`reEmit blocking check`): SELECTs the invoice's nfse_records and uses an in-memory find() for pending, processing or issued. Concurrent requests can both see no blocker before either inserts.
3. **propagation** `src/server/db/schema/nfse.ts:9` (`nfseRecords table`): Only the id primary key is defined. There is no unique or partial index on invoice_id, so a second row inserts successfully.
4. **sink** `src/server/workflows/nfse-generation.ts:86` (`emit nfse step`): Each Workflow instance calls service.emitNfse with externalReference invoice-<id>. The step retries up to 3 times, and the DB update follows emitNfse inside the same step, so an update failure repeats the emit. A fiscal document is issued per call unless the Fiscal API de-duplicates.

### Evidence

- `src/server/routers/trpc/nfse.ts:94`: Unconditional insert (lines 94-100) followed by NFSE_WORKFLOW.create with id = a fresh nanoid (lines 102-105). There is no invoice-keyed Workflow dedupe.
- `src/server/routers/rest/webhooks.ts:405`: The webhook path uses the same SELECT-then-INSERT pattern (select at 405, insert at 412, workflow create at 419). It is guarded only by the existence check, which the comment at line 403-404 presents as the duplicate guard.
- `src/server/workflows/nfse-generation.ts:104`: The DB update runs after emitNfse inside the retried step, so a failure there re-invokes emitNfse.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Fiscal Nacional API idempotency behaviour for a repeated external_reference is outside the repository

### Validation plan

- **Local (sandboxed):** In a sandbox with a mocked Fiscal API and a local D1 (miniflare), seed a paid invoice and a user. Fire two concurrent nfse.reEmit calls with Promise.all and assert that two nfse_records rows exist and that the mock received two emit requests. Then add a partial unique index on invoice_id for live statuses, or a conditional insert, and assert that only one call succeeds.
- **Owner check (deployment):** Owner: confirm with the Fiscal Nacional provider (staging) whether POST /api/v1/external/nfse with a repeated external_reference returns the existing document or creates a second one.

## N10. Staging seed script provisions a documented admin account with a known password

- **Fingerprint:** `obvious.seed-known-admin-credentials-staging`
- **Claimed root cause:** Hard-coded, publicly documented credentials with pre-hashed passwords are seeded into a remote, potentially internet-facing environment. The seeded users are pre-verified, and the admin has role 'admin'.

seed-staging.ts inserts admin@example.com (role admin, email_verified=1) with a pre-hashed credential account into the staging D1 via wrangler d1 execute --remote. The plaintext passwords (Admin1234!, User1234!, Pro1234!, Business1234!, Agency1234!) are published in the file header and the script's console output. Because the users are pre-verified, email verification does not stop a sign-in. If the seed was run against a staging deployment reachable from the internet, anyone could sign in as the seeded admin. This is a deployment fact that source cannot show. Source also does not confirm that the hard-coded scrypt-style hash for the admin actually matches Admin1234!. The user, pro, business and agency credential rows all carry the same salt:hash value even though four different passwords are documented, so at most one of those four documented passwords can verify and the documentation for the others is inconsistent with the seeded data. The admin hash is distinct.

### Trace

1. **entrypoint** `src/server/db/seeds/seed-staging.ts:108` (`seed runner`): Runs wrangler d1 execute DB --env staging --remote --file with the generated SQL, writing to the remote staging D1. It is invoked via the db:seed:staging package script.
2. **propagation** `src/server/db/seeds/seed-staging.ts:24` (`SQL`): Inserts the admin user row (admin@example.com, email_verified=1, role 'admin').
3. **sink** `src/server/db/seeds/seed-staging.ts:34` (`SQL`): Inserts the credential account row for admin@example.com with a pre-computed password hash, so the documented password signs in.

### Evidence

- `src/server/db/seeds/seed-staging.ts:11`: The header comment documents admin@example.com / Admin1234! with role admin.
- `src/server/db/seeds/seed-staging.ts:36`: The credential account row carries a fixed salt:hash password value, committed to the repo.
- `src/server/db/seeds/seed-staging.ts:42`: The user@example.com credential hash is byte-identical to the hashes at lines 48, 54 and 60 (pro, business, agency), despite four different documented passwords in lines 12-15.
- `src/server/db/seeds/seed-staging.ts:113`: The script prints the plaintext credentials after seeding.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Whether the seed was ever run against a reachable staging deployment is a deployment fact outside the source. It is not observable without contacting the deployed environment.

### Validation plan

- **Local (sandboxed):** In a sandbox, apply the seed SQL to a throwaway local D1 with dummy Better Auth config. Confirm which of the documented passwords (Admin1234!, User1234!, Pro1234!, Business1234!, Agency1234!) verify against the stored hashes using Better Auth's password verifier. Then confirm that sign-in succeeds and that adminProcedure routes accept the admin session. Make no network calls.
- **Owner check (deployment):** The staging owner should check the staging D1 for user id 'seed-user-admin-0000-0000-000000000001' and for the seeded @example.com emails. The owner should also try a sign-in with the documented credentials on staging themselves. If the rows exist, delete them, rotate any affected sessions, and change the script to read a password from the environment.

## N11. Referral reward is marked paid before credits are granted, so a failed grant loses the reward permanently

- **Fingerprint:** `referral-reward-ledger-committed-before-credit-grant-nonatomic`
- **Claimed root cause:** The idempotency record and the 'rewarded' status are committed before the credit-grant side effect, and the three steps are not in one atomic D1 batch. A failure between them is neither retried nor compensated.

processReferralReward inserts the idempotency row in referral_rewards (referral.ts:211) and sets the referral to 'rewarded' (referral.ts:229) before it calls addCredits for the referrer (232) and the referred user (240). These are separate statements, not one atomic unit. If either addCredits call throws, the reward row already exists. The webhook only logs the error inside waitUntil, and any retry returns already_rewarded (referral.ts:157 and 225). The credits are then lost permanently, and creditsEarned (a sum over referral_rewards) overstates what was paid. A failure in the second call also leaves a partial grant: the referrer is paid and the referred user is not. addCredits uses db.transaction on the drizzle D1 driver, which issues a raw 'begin' (drizzle-orm/d1/session.js). Whether Cloudflare D1 rejects that statement is a platform fact the source cannot show. If it does, every addCredits caller would fail, including the plan grant in the same webhook. This is an integrity failure of the credit ledger that loses credits. It does not let an attacker obtain free credits. Reachability is source-confirmed only for the non-atomic ordering. Whether addCredits fails in practice has not been observed.

### Trace

1. **entrypoint** `src/server/routers/rest/webhooks.ts:145` (`checkout.session.completed handler`): Calls processReferralReward from c.executionCtx.waitUntil (lines 145-156) and only logs rejections with console.error.
2. **propagation** `src/server/services/referral.ts:211` (`processReferralReward`): Inserts the referral_rewards row with onConflictDoNothing, then sets the referral to 'rewarded' at line 229. After this point, a retry returns already_rewarded (lines 157 and 225).
3. **sink** `src/server/services/credits.ts:43` (`addCredits`): Runs db.transaction on the D1 driver, which issues a raw begin. It is called twice in sequence (referral.ts:232 and 240). A throw in either call leaves the ledger marked paid with no credits, or only the referrer's credits, granted.

### Evidence

- `src/server/services/referral.ts:225`: If the insert returns no row, the function returns already_rewarded. Line 157 does the same when an existing reward is found. Neither re-attempts the credit grant.
- `src/server/services/referral.ts:229`: The referral is set to 'rewarded' before any credits are granted. No try/catch or compensation surrounds the addCredits calls at 232 and 240.
- `node_modules/drizzle-orm/d1/session.js:65`: D1Session.transaction (line 63) runs sql.raw('begin') through the D1 binding at line 65, then commit or rollback.
- `src/server/db/index.ts:6`: initDb always returns drizzle(env.DB) from drizzle-orm/d1, with no alternative driver.
- `src/server/routers/rest/webhooks.ts:153`: The catch handler (lines 153-154) only logs through console.error, and the work runs in waitUntil, so no retry occurs.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Whether Cloudflare D1 rejects BEGIN issued through the Workers binding is a platform fact outside the source. The partial-failure window exists regardless, but whether addCredits throws in practice is not source-observable.

### Validation plan

- **Local (sandboxed):** In a maintainer-run sandbox (for example vitest with miniflare/workerd D1), seed a referrer, a referred user and a pending referral. Make addCredits throw on its second call, either by stubbing it or by dropping the credit_transactions table, then call processReferralReward. Assert that referral_rewards has a row, the referral status is 'rewarded', and the credits are missing or only half granted. Call processReferralReward again and assert it returns already_rewarded with the credits still missing. Separately run addCredits against workerd D1 to see whether db.transaction throws.
- **Owner check (deployment):** On the owner's staging D1, call addCredits through a test-only path for a dummy user and check whether it errors on BEGIN. Then complete one dummy referral checkout in Stripe test mode and compare referral_rewards, credit_transactions and subscriptions.credit_balance. Do not probe production.

## N12. Stripe webhook records the event id as processed before side effects run, so a failed handler is never retried

- **Fingerprint:** `stripe-webhook:dedupe-commit-before-side-effects-lost-on-failure`
- **Claimed root cause:** The idempotency marker (webhook_events row) is committed before the guarded work. It is never rolled back, deleted or marked complete on failure. A retry is therefore acknowledged as a duplicate although the first attempt did not finish. The webhook_events table has no processed or completed state to tell the two cases apart.

The webhook inserts event.id into webhook_events and then runs the side effects. The insert is not in a transaction, and nothing deletes the row on error. The handler awaits Stripe and D1 calls with no try/catch: billing.getSubscription, the subscriptions upsert, addCredits, and on invoice.payment_succeeded billing.stripe.subscriptions.retrieve and createInvoiceFromStripe. If one of them throws, the app-level onError handler (src/server/index.ts:28) returns a 500 JSON response for any non-HTTPException error, so Stripe redelivers. The redelivery conflicts on the stored id and returns {received:true,duplicate:true} with a 200, so the work is permanently dropped. The affected work includes the subscription upsert and credit grant on checkout.session.completed, and invoice creation on invoice.payment_succeeded. A paying customer can end up with no credits, no plan update or no invoice, and Stripe will not retry. No attacker is needed. The source establishes the ordering defect and the 500 response on a throw. The remaining unknown is only whether a transient Stripe or D1 failure occurs in a real deployment, and this run cannot execute the path.

### Trace

1. **entrypoint** `src/server/routers/rest/webhooks.ts:26` (`POST /api/webhooks/stripe`): Signed Stripe event accepted after constructWebhookEvent signature verification (lines 37-49); this is the only gate before the dedupe insert.
2. **propagation** `src/server/routers/rest/webhooks.ts:55` (`webhookEvents insert`): INSERT ... ON CONFLICT DO NOTHING RETURNING commits event.id before any side effect. A conflicting retry returns {received:true,duplicate:true} at line 62.
3. **sink** `src/server/routers/rest/webhooks.ts:85` (`checkout.session.completed and invoice.payment_succeeded handlers`): Awaited Stripe and D1 calls are not wrapped in try/catch: getSubscription (line 85), the subscriptions upsert (97-122), addCredits (125), subscriptions.retrieve (292) and createInvoiceFromStripe (334). A throw propagates to app.onError (src/server/index.ts:28), which returns a 500 response. The event id is already stored, so the retry is skipped.

### Evidence

- `src/server/routers/rest/webhooks.ts:51`: Comment states that the event id is recorded before running side effects.
- `src/server/routers/rest/webhooks.ts:61`: Early return for an existing id, with no status or completion check. The only try/catch blocks in the file are the signature check (37-43) and inside the waitUntil background tasks, so none cover the awaited handler work and none delete the row.
- `src/server/db/schema/billing.ts:88`: webhook_events has only id, type and createdAt, with no processed or completed state.
- `src/server/index.ts:28`: app.onError returns a 500 JSON response for any error that is not an HTTPException or lacks a numeric status, so a thrown handler error produces a non-2xx response and Stripe retries.
- `src/server/services/credits.ts:35`: addCredits (defined at line 35) takes an optional stripePaymentIntentId (line 41) that is only written to credit_transactions (line 81), with no idempotency lookup. Replay protection therefore rests on the event-id row alone, so simply removing the guard would risk double grants. The fix must delete the row on failure or insert it only after success.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Whether D1 or Stripe calls fail transiently in a real deployment is an environmental fact outside the source, and this run cannot execute the handler to demonstrate the retry being dropped.

### Validation plan

- **Local (sandboxed):** In a sandboxed vitest or miniflare test, mock the billing service so getSubscription throws once. POST a validly signed checkout.session.completed event with metadata.userId and expect a 500 response. Re-POST the same event and expect {received:true,duplicate:true}, with no subscriptions row and no credit_transactions row. Then apply the fix: delete the webhook_events row in a catch block that rethrows, or insert it only after success (or in the same D1 batch as the writes). Re-run to verify that the retry processes the event once.
- **Owner check (deployment):** In Stripe test mode on the owner's own staging, make one dependency fail for a single delivery, for example a temporarily invalid STRIPE_API_KEY. Confirm in the Stripe dashboard that the first delivery fails and the retry returns 200. Then check that the webhook_events row exists while no credits or subscription update were applied. Use only test-mode data.

## N13. Subscription updated and deleted webhooks never match a user because checkout does not set subscription metadata

- **Fingerprint:** `stripe-webhook:subscription-lifecycle-metadata-userid-never-set`
- **Claimed root cause:** Identity for the lifecycle events comes from subscription.metadata.userId, which the code never sets. The handlers should resolve the user by stripeSubscriptionId or stripeCustomerId, or checkout should pass subscription_data.metadata.

The customer.subscription.updated and customer.subscription.deleted handlers find the owner through subscription.metadata.userId and break silently when it is missing. Checkout sets userId only in the Checkout Session `metadata` and on the Stripe customer. It never passes subscription_data.metadata, and no code in src sets metadata on a subscription. Stripe documents that Checkout Session metadata is not copied to the Subscription, and if that holds the handlers never run. After a cancellation or a payment-failure status change, the local row would keep its paid plan and active status, and cancel-at-period-end and period end would go stale. For subscription.deleted the downgrade to the free plan would never happen, so a user whose subscription ended could keep paid-plan access and renewal-credit eligibility locally. The event is still recorded as processed, so Stripe does not retry it. Separately, the updated handler does not write plan or price even when it does run, so portal plan changes are not synced either way. That gap is outside this root cause.

### Trace

1. **entrypoint** `src/server/routers/trpc/billing.ts:127` (`createCheckoutSession`): The checkout session is created with session-level metadata {userId} only.
2. **propagation** `src/server/services/billing.ts:45` (`stripe.checkout.sessions.create`): Only `metadata: params.metadata` is passed to the session. There is no subscription_data.metadata.
3. **sink** `src/server/routers/rest/webhooks.ts:164` (`customer.subscription.updated and customer.subscription.deleted`): userId = subscription.metadata?.userId; `if (!userId) break;` at lines 165 and 216 skips the local update.

### Evidence

- `src/server/routers/rest/webhooks.ts:215`: The deleted handler reads subscription.metadata.userId at line 215 and sets plan to free and status to inactive only when it is present (lines 216-231).
- `src/server/services/billing.ts:27`: userId metadata is set on the Stripe customer, not on the subscription.
- `src/server/routers/rest/webhooks.ts:275`: Renewal credits on invoice.payment_succeeded use sub.plan from the local row. That row is downgraded only by the metadata-gated deleted handler, so after a cancellation the plan would stay paid. The updated handler never writes plan.
- `src/server/services/billing.ts:65`: The only subscriptions.update calls are in this file (cancel_at_period_end toggles). A grep of src finds no place that sets subscription metadata and no subscription_data.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Whether Stripe copies Checkout Session metadata onto the created Subscription is external Stripe behavior and cannot be verified from this repository. A Stripe-side setting that sets the metadata cannot be excluded from source alone.

### Validation plan

- **Local (sandboxed):** In a sandboxed unit test, feed the handler a customer.subscription.deleted event with empty metadata and confirm that the subscriptions row is unchanged. Then add subscription_data: { metadata: { userId } } to createCheckoutSession, or resolve the user by stripeSubscriptionId, and confirm the downgrade happens.
- **Owner check (deployment):** In Stripe test mode on the owner's staging, complete a test checkout and open the created subscription to see whether its metadata contains userId. Cancel the subscription and check whether the DB row still shows an active paid plan. Use test-mode data only and do not touch production.

## N14. deleteAccount does not revoke KV-backed sessions, so deleted accounts keep a valid session

- **Fingerprint:** `user-deleteaccount-kv-session-not-revoked`
- **Claimed root cause:** deleteAccount bypasses Better Auth's internalAdapter.deleteUser and auth.api.revokeSessions, the paths that clear secondary-storage session tokens and the active-sessions list. The session lookup trusts the KV copy and never rechecks the user row.

user.deleteAccount removes session rows and the user row with raw Drizzle queries. Better Auth is configured with SESSION_KV as secondaryStorage and no storeSessionInDatabase. In that mode live sessions are stored in KV as token -> {session,user}, plus an active-sessions list. Those KV entries are not purged by deleteAccount. In better-auth 1.7.12, findSession returns the session and user straight from the KV record and never checks the user table. A deleted user's session cookie, including a copy on another device, may therefore still populate ctx.session in protectedProcedure until the KV entry expires (default 7 days; the cookie cache adds up to 5 minutes). The code comment 'Revoke all sessions so any other device/tab is immediately logged out' is not true for this configuration. Impact is limited to the revocation guarantee: most queries are userId-scoped and their rows are gone through the cascade, so there is no cross-tenant access. Procedures that call Stripe before a DB write, such as createCheckoutSession, may still be reachable. The unresolved fact is the runtime behaviour, which was not run. Source inspection shows no code path that clears the KV records.

### Trace

1. **entrypoint** `src/server/routers/trpc/user.ts:62` (`userRouter.deleteAccount`): Authenticated mutation. It passes the password or 15-minute freshness check, cancels Stripe, then deletes DB session rows (118-120) and the user row (125-127) with raw Drizzle. It never touches KV.
2. **propagation** `src/server/lib/auth.ts:90` (`secondaryStorage on SESSION_KV (no storeSessionInDatabase)`): Live sessions are held in KV, so the DB session delete does not affect them. Only cookieCache (maxAge 5 min) is set under session, at lines 189-194.
3. **propagation** `src/server/middlewares/sessionMiddleware.ts:10` (`sessionMiddleware`): api.getSession resolves through better-auth findSession (internal-adapter.mjs:333-353), which returns the KV record with no user-table lookup.
4. **sink** `src/server/lib/trpc.ts:11` (`protectedProcedure`): Only checks that ctx.session is truthy, so a stale KV session still authorizes procedures after the account is deleted.

### Evidence

- `src/server/routers/trpc/user.ts:116`: The comment claims all sessions are revoked, but the code only deletes DB session rows (118-123), then raw-deletes the user row (125-127).
- `src/server/lib/auth.ts:189`: session config has only cookieCache (5 min). storeSessionInDatabase is not set, so KV is the session authority.
- `node_modules/better-auth/dist/db/internal-adapter.mjs:244`: The library deleteUser gets the active session references first, then queueCachedUserSessionDeletion (line 257) purges the KV tokens. The app never calls it.
- `node_modules/better-auth/dist/db/internal-adapter.mjs:333`: findSession returns the parsed KV record when present (337-352) without checking that the user still exists.
- `src/server/services/cron-cleanup.ts:11`: The cron only deletes expired DB session rows and does not clear KV copies, which expire only through their own TTL.

### Blockers

- No OS-enforced sandbox available in this run (no enforceable memory limit on macOS; Docker daemon unavailable)
- Not confirmed at runtime: that the deployed SESSION_KV binding is the live session store, and that no Worker or library path (for example the session route or cookie cache) rejects a session whose user row is gone. Source shows none, but this was not run.

### Validation plan

- **Local (sandboxed):** In a sandbox (vitest or wrangler dev with an in-memory KV and local D1), create a dummy user and sign in, so the session token and active-sessions-{userId} keys sit in SESSION_KV. Call trpc user.deleteAccount with a fresh session. Then call a read-only procedure such as user.getProfile with the same cookie, and list the SESSION_KV keys. The bug is present if the request is not rejected with UNAUTHORIZED and the KV keys remain. After the fix (call auth.$context.internalAdapter.deleteUser, or delete the KV session tokens and the active-sessions key), expect UNAUTHORIZED and empty KV keys.
- **Owner check (deployment):** On staging with a throwaway account, record the session cookie, delete the account through the UI, then replay the cookie against /trpc/user.getProfile within the 7-day window and see whether it is still authorized. The owner can also list SESSION_KV keys with the prefix active-sessions- for deleted user ids.

