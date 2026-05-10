import { Hono } from "hono";
import type { AppBindings } from "../../lib/types";
import { internalRouter } from "./internal";
import { registerInvoiceRoutes } from "./invoices";
import { registerWebhookRoutes } from "./webhooks";

export const restApiRouter = new Hono<AppBindings>();

restApiRouter.get("/health", (c) => {
	return c.json({
		status: "ok",
		environment: c.env.ENVIRONMENT,
		timestamp: new Date().toISOString(),
	});
});

registerWebhookRoutes(restApiRouter);
registerInvoiceRoutes(restApiRouter);

// Internal API — Trigger.dev callbacks (auth middleware is inside the router)
restApiRouter.route("/", internalRouter);
