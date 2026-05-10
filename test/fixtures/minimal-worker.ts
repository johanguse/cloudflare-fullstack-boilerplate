/**
 * Minimal worker for Vitest + @cloudflare/vitest-pool-workers.
 * Avoids full app bindings until local Miniflare mirrors production resources.
 */
import { Hono } from "hono";

const app = new Hono<{ Bindings: { ENVIRONMENT: string } }>();

app.get("/api/v1/health", (c) => {
	return c.json({
		status: "ok",
		environment: c.env.ENVIRONMENT,
		timestamp: new Date().toISOString(),
	});
});

export default {
	fetch: app.fetch,
};
