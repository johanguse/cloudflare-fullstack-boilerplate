export function requireAuthSecret(secret: string | undefined): string {
	if (
		!secret ||
		secret.trim().length < 32 ||
		secret.trim() === "better-auth-secret-12345678901234567890" ||
		secret.trim() === "your-random-32-char-secret-here"
	) {
		throw new Error(
			"BETTER_AUTH_SECRET must be a private, random secret of at least 32 characters",
		);
	}
	return secret;
}

// Share a recipient budget across all anonymous email senders, including the
// legacy OTP reset alias still exposed by Better Auth.
export const AUTH_EMAIL_ENDPOINTS = [
	"/sign-up/email",
	"/request-password-reset",
	"/send-verification-email",
	"/email-otp/send-verification-otp",
	"/email-otp/request-password-reset",
	"/forget-password/email-otp",
	"/email-otp/request-email-change",
];

export const AUTH_CAPTCHA_ENDPOINTS = [
	"/sign-in/email",
	"/reset-password",
	...AUTH_EMAIL_ENDPOINTS,
];

export function createAuthRateLimiter(db: D1Database, secret: string) {
	const signingKey = crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return {
		async consume(key: string, rule: { window: number; max: number }) {
			const digest = await crypto.subtle.sign(
				"HMAC",
				await signingKey,
				new TextEncoder().encode(key),
			);
			const storageKey = Array.from(new Uint8Array(digest), (byte) =>
				byte.toString(16).padStart(2, "0"),
			).join("");
			const now = Date.now();
			const expiresAt = now + rule.window * 1000;
			// One conditional UPSERT is the admission gate. Denied requests neither
			// increment the counter nor extend the window; expiry resets it to one.
			const admitted = await db
				.prepare(`
				INSERT INTO auth_rate_limits (key, count, expires_at) VALUES (?, 1, ?)
				ON CONFLICT(key) DO UPDATE SET
					count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
					expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
				WHERE expires_at <= ? OR count < ?
				RETURNING expires_at
			`)
				.bind(storageKey, expiresAt, now, now, now, rule.max)
				.first<{ expires_at: number }>();
			if (admitted) return { allowed: true, retryAfter: null };
			const current = await db
				.prepare("SELECT expires_at FROM auth_rate_limits WHERE key = ?")
				.bind(storageKey)
				.first<{ expires_at: number }>();
			return {
				allowed: false,
				retryAfter: Math.max(
					1,
					Math.ceil(((current?.expires_at ?? expiresAt) - now) / 1000),
				),
			};
		},
	};
}
