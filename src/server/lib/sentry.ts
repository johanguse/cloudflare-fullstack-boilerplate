import type { CloudflareOptions } from "@sentry/cloudflare";
import { getSentryDataCollection } from "../../shared/sentry";
import type { AppEnv } from "./types";

export function getSentryOptions(
	env: Pick<AppEnv, "SENTRY_DSN" | "ENVIRONMENT">,
): CloudflareOptions {
	return {
		enabled: Boolean(env.SENTRY_DSN),
		dsn: env.SENTRY_DSN,
		environment: env.ENVIRONMENT,
		tracesSampleRate: env.ENVIRONMENT === "production" ? 0.2 : 1.0,
		dataCollection: getSentryDataCollection(),
	};
}
