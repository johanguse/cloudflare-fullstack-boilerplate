import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "../lib/types";

const corsMiddleware: MiddlewareHandler<AppBindings> = (c, next) => {
	const trustedOrigins = c.env.TRUSTED_ORIGINS
		? c.env.TRUSTED_ORIGINS.split(",")
				.map((o) => o.trim())
				.filter(Boolean)
		: [];

	// Fail closed: with credentialed CORS a wildcard origin is both spec-invalid
	// and a security risk. In dev we allow localhost; otherwise, if no trusted
	// origins are configured, reflect nothing (same-origin only).
	const isDev = c.env.ENVIRONMENT?.includes("development") ?? false;
	const fallbackOrigins = isDev
		? ["http://localhost:5173", "http://localhost:8787"]
		: [];
	const allowedOrigins =
		trustedOrigins.length > 0 ? trustedOrigins : fallbackOrigins;

	return cors({
		origin: (origin) =>
			allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? null),
		maxAge: 86400,
		credentials: true,
	})(c, next);
};

export default corsMiddleware;
