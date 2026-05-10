import type { AppEnv as Env } from "./types";

export interface AppConfig {
	isDevelopment: boolean;
	isStaging: boolean;
	isProduction: boolean;
	frontendUrl: string;
	apiUrl: string;
	appName: string;
	fromEmail: string;
}

export function createAppConfig(env: Env): AppConfig {
	const isDevelopment = env.ENVIRONMENT === "development" || !env.ENVIRONMENT;
	const isStaging = env.ENVIRONMENT === "staging";
	const isProduction = env.ENVIRONMENT === "production";

	const frontendUrl = isDevelopment
		? "http://localhost:5173"
		: (env.BETTER_AUTH_URL ?? "https://app.yourdomain.com");

	const apiUrl = isDevelopment ? "http://localhost:8787" : frontendUrl;

	return {
		isDevelopment,
		isStaging,
		isProduction,
		frontendUrl,
		apiUrl,
		appName: env.APP_NAME ?? "My SaaS",
		fromEmail: env.FROM_EMAIL ?? "no-reply@yourdomain.com",
	};
}
