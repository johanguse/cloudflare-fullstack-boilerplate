/// <reference path="../../../worker-configuration.d.ts" />

import type { Session, User } from "better-auth";
import type { DBInstance } from "../db";
import type { BetterAuthInstance } from "./auth";

// Extend the generated Env with secrets (injected via .dev.vars / wrangler secret put)
// These are not in wrangler.jsonc vars, so wrangler types won't generate them.
export type AppEnv = Env & {
	APP_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_GOOGLE_CLIENT_ID: string;
	BETTER_AUTH_GOOGLE_CLIENT_SECRET: string;
	BETTER_AUTH_GITHUB_CLIENT_ID: string;
	BETTER_AUTH_GITHUB_CLIENT_SECRET: string;
	STRIPE_API_KEY: string;
	STRIPE_WEBHOOK_SECRET: string;
	FISCAL_NACIONAL_API_KEY: string;
	FISCAL_NACIONAL_ENVIRONMENT: string;
	TRIGGER_API_KEY: string;
	INTERNAL_API_KEY: string;
	SENTRY_DSN?: string;
	CLOUDFLARE_ACCOUNT_ID?: string;
	CLOUDFLARE_API_TOKEN?: string;
	CLOUDFLARE_DATABASE_ID?: string;
	CLOUDFLARE_DATABASE_ID_LOCAL?: string;
	CLOUDFLARE_DATABASE_ID_STAGING?: string;
	CLOUDFLARE_DATABASE_ID_PRODUCTION?: string;
};

export interface AppBindings {
	Bindings: AppEnv;
	Variables: {
		user: User | null;
		session: Session | null;
		db: DBInstance;
		auth: BetterAuthInstance;
		isApiDomain?: boolean;
		executionCtx?: ExecutionContext;
	};
}

export interface CfGeoProperties {
	country?: string;
	city?: string;
	region?: string;
	timezone?: string;
	postalCode?: string;
	latitude?: string;
	longitude?: string;
	isEUCountry?: boolean;
}

export interface tRPCContext {
	env: AppEnv;
	db: DBInstance;
	session: Session | null;
	geo?: CfGeoProperties;
}
