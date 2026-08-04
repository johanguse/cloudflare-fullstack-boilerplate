import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha, emailOTP } from "better-auth/plugins";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { REFERRAL_COOKIE_NAME } from "../../shared/referral";
import * as schema from "../db/schema/auth";
import { sendOtpEmail } from "../services/email";
import { recordReferralAttribution } from "../services/referral";
import { getUserLocale } from "../services/user-locale";
import { createAppConfig } from "./config";
import { readCookie } from "./cookies";
import type { AppBindings } from "./types";

export const createAuth = (
	db: DrizzleD1Database,
	env: AppBindings["Bindings"],
) => {
	const config = createAppConfig(env);

	const trustedOrigins = env.TRUSTED_ORIGINS
		? env.TRUSTED_ORIGINS.split(",")
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
					endpoints: [
						"/sign-in/email",
						"/sign-up/email",
						"/forget-password",
						"/reset-password",
					],
				}),
			]
		: [];

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema,
		}),
		secret: env.BETTER_AUTH_SECRET ?? "",
		baseURL: env.BETTER_AUTH_URL ?? config.frontendUrl,
		basePath: "/api/auth",
		trustedOrigins,
		emailAndPassword: {
			enabled: true,
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
		secondaryStorage: {
			get: async (key) => {
				const value = await env.SESSION_KV.get(key);
				return value;
			},
			set: async (key, value, ttl) => {
				if (ttl) {
					await env.SESSION_KV.put(key, value, { expirationTtl: ttl });
				} else {
					await env.SESSION_KV.put(key, value);
				}
			},
			delete: async (key) => {
				await env.SESSION_KV.delete(key);
			},
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
			storage: "secondary-storage",
			window: 60,
			max: 10,
		},
		advanced: {
			crossSubDomainCookies: {
				enabled: true,
			},
		},
		session: {
			cookieCache: {
				enabled: true,
				maxAge: 5 * 60,
			},
		},
	});
};

export type BetterAuthInstance = ReturnType<typeof createAuth>;
