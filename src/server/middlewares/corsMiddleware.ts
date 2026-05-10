import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "../lib/types";

const corsMiddleware: MiddlewareHandler<AppBindings> = (c, next) => {
	const trustedOrigins = c.env.TRUSTED_ORIGINS
		? c.env.TRUSTED_ORIGINS.split(",").map((o) => o.trim())
		: [];

	return cors({
		origin: trustedOrigins.length > 0 ? trustedOrigins : "*",
		maxAge: 86400,
		credentials: true,
	})(c, next);
};

export default corsMiddleware;
