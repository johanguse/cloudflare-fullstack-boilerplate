import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { captcha, emailOTP } from "better-auth/plugins";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { REFERRAL_COOKIE_NAME } from "../../shared/referral";
import * as schema from "../db/schema/auth";
import { sendOtpEmail } from "../services/email";
import { recordReferralAttribution } from "../services/referral";
import { getUserLocale } from "../services/user-locale";
import {
	AUTH_CAPTCHA_ENDPOINTS,
	AUTH_EMAIL_ENDPOINTS,
	createAuthRateLimiter,
	requireAuthSecret,
} from "./auth-security";
import { createAppConfig } from "./config";
import { readCookie } from "./cookies";
import type { AppBindings } from "./types";

export const createAuth = (
	db: DrizzleD1Database,
	env: AppBindings["Bindings"],
) => {
	const config = createAppConfig(env);
	const secret = requireAuthSecret(env.BETTER_AUTH_SECRET);
	if (env.ENVIRONMENT !== "development" && !env.TURNSTILE_SECRET_KEY) {
		throw new Error(
			"TURNSTILE_SECRET_KEY is required outside local development",
		);
	}
	const rateLimiter = createAuthRateLimiter(env.DB, secret);

	const trustedOrigins = env.TRUSTED_ORIGINS
		? env.TRUSTED_ORIGINS.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean)
		: [];

	// Server-side Turnstile verification. The client sends the token in the
	// `x-captcha-response` header; the plugin rejects sign-in, sign-up, and
	// password-reset requests with a missing or invalid token. Only enabled
	// when the secret is configured so local dev without a secret still works.
	const captchaPlugins = env.TURNSTILE_SECRET_KEY
		? [
				captcha({
					provider: "cloudflare-turnstile",
					secretKey: env.TURNSTILE_SECRET_KEY,
					endpoints: AUTH_CAPTCHA_ENDPOINTS,
				}),
			]
		: [];

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
		secret,
		baseURL: env.BETTER_AUTH_URL ?? config.frontendUrl,
		basePath: "/api/auth",
		trustedOrigins,
		emailAndPassword: {
			enabled: true,
			revokeSessionsOnPasswordReset: true,
			minPasswordLength: 10,
			maxPasswordLength: 128,
			requireEmailVerification: true,
			async sendResetPassword({ user, url }) {
				if (config.isDevelopment) {
					console.log(`[DEV] Password reset link for ${user.email}: ${url}`);
					return;
				}
				const locale = await getUserLocale(db, user.id);
				const { sendPasswordResetEmail } = await import("../services/email");
				await sendPasswordResetEmail(env, config, user.email, url, locale);
			},
		},
		emailVerification: {
			async sendVerificationEmail({ user, url }) {
				if (config.isDevelopment) {
					console.log(
						`[DEV] Email verification link for ${user.email}: ${url}`,
					);
					return;
				}
				const locale = await getUserLocale(db, user.id);
				const { sendVerifyEmailLink } = await import("../services/email");
				await sendVerifyEmailLink(env, config, user.email, url, locale);
			},
		},
		socialProviders: {
			google: {
				clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID ?? "",
				clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET ?? "",
			},
			github: {
				clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID ?? "",
				clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET ?? "",
			},
		},
		// D1 is authoritative for sessions and single-use verification values.
		// In particular, OTP consumption uses the adapter's DELETE ... RETURNING.
		verification: { storeInDatabase: true },
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (!ctx.path || !AUTH_EMAIL_ENDPOINTS.includes(ctx.path)) return;
				const email = ctx.body?.newEmail ?? ctx.body?.email;
				if (typeof email !== "string") return;
				const result = await rateLimiter.consume(
					`recipient:${email.trim().toLowerCase()}`,
					{
						window: 15 * 60,
						max: 5,
					},
				);
				if (!result.allowed) {
					ctx.setHeader("Retry-After", String(result.retryAfter));
					throw new APIError("TOO_MANY_REQUESTS", {
						message: "Too many email requests. Please try again later.",
					});
				}
			}),
		},
		databaseHooks: {
			user: {
				create: {
					after: async (created, ctx) => {
						// Referral attribution: a `/r/:code` link sets a cookie that both
						// email and OAuth signups carry back here. Never let attribution
						// failures block account creation.
						const referralCode = readCookie(
							ctx?.headers ?? ctx?.request?.headers,
							REFERRAL_COOKIE_NAME,
						);
						if (referralCode) {
							try {
								await recordReferralAttribution(db, {
									code: referralCode,
									referredUserId: created.id,
								});
							} catch (e) {
								console.error("[auth] referral attribution failed:", e);
							}
						}

						if (config.isDevelopment) {
							console.log(`[DEV] Welcome email would go to ${created.email}`);
							return;
						}
						try {
							const { sendWelcomeEmail } = await import("../services/email");
							// locale defaults to "en" for new users; they can update it in settings
							const locale = (created as { locale?: string }).locale ?? "en";
							await sendWelcomeEmail(
								env,
								config,
								created.email,
								created.name,
								locale,
							);
						} catch (e) {
							console.error("[auth] welcome email failed:", e);
						}
					},
				},
			},
		},
		plugins: [
			...captchaPlugins,
			emailOTP({
				expiresIn: 600,
				storeOTP: "hashed",
				async sendVerificationOTP({ email, otp, type }) {
					if (config.isDevelopment) {
						console.log(`[DEV] OTP for ${email} (${type}): ${otp}`);
						return;
					}
					await sendOtpEmail(env, config, email, otp, type);
				},
			}),
		],
		rateLimit: {
			enabled: true,
			customStorage: rateLimiter,
			window: 60,
			max: 10,
		},
		advanced: {
			ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
			crossSubDomainCookies: {
				enabled: true,
			},
		},
		session: {
			storeSessionInDatabase: true,
			cookieCache: {
				enabled: false,
			},
		},
	});
};

export type BetterAuthInstance = ReturnType<typeof createAuth>;
