import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../db/schema/auth";
import { sendOtpEmail } from "../services/email";
import { getUserLocale } from "../services/user-locale";
import { createAppConfig } from "./config";
import type { AppBindings } from "./types";

export const createAuth = (
	db: DrizzleD1Database,
	env: AppBindings["Bindings"],
) => {
	const config = createAppConfig(env);

	const trustedOrigins = env.TRUSTED_ORIGINS
		? env.TRUSTED_ORIGINS.split(",")
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
			minPasswordLength: 8,
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
					after: async (created) => {
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
