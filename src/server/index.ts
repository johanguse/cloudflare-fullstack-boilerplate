import { trpcServer } from "@hono/trpc-server";
import * as Sentry from "@sentry/cloudflare";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { initDb } from "./db";
import type { AppBindings } from "./lib/types";
import authMiddleware from "./middlewares/authMiddleware";
import corsMiddleware from "./middlewares/corsMiddleware";
import sessionMiddleware from "./middlewares/sessionMiddleware";
import { appRouter } from "./routers";
import { restApiRouter } from "./routers/rest";
import { runScheduledCleanup } from "./services/cron-cleanup";

const app = new Hono<AppBindings>({ strict: false });

app.onError((err, c) => {
	console.error("Unhandled error:", err);

	const isHTTPException =
		err instanceof HTTPException ||
		(err &&
			typeof err === "object" &&
			"status" in err &&
			typeof (err as HTTPException).status === "number");

	if (isHTTPException) {
		const status = (err as HTTPException).status;
		return c.json(
			{ error: err.message ?? "HTTP Error" },
			status as ContentfulStatusCode,
		);
	}

	return c.json(
		{
			error: "Internal Server Error",
			message:
				c.env.ENVIRONMENT === "development"
					? err.message
					: "Something went wrong",
		},
		500,
	);
});

app.use("*", logger());
app.use("*", async (c, next) => {
	if (c.env.ENVIRONMENT !== "production") {
		return prettyJSON()(c, next);
	}
	return next();
});
app.use("*", authMiddleware);
app.use("*", corsMiddleware);
app.use("*", sessionMiddleware);
app.use("*", timing());
app.use(
	"*",
	secureHeaders({
		contentSecurityPolicy: {
			reportUri: "/api/v1/csp-report",
		},
	}),
);

// Detect API subdomain to route API-only requests
app.use("*", async (c, next) => {
	const hostname = c.req.header("host") ?? "";
	const isDev = hostname.includes("localhost:8787");
	const isApiDomain = hostname.includes("api.") || isDev;
	c.set("isApiDomain", isApiDomain);
	return next();
});

// Auth (Better Auth) — only on app domain
app.use("/api/auth/*", async (c, next) => {
	if (c.get("isApiDomain") && !c.env.ENVIRONMENT?.includes("development")) {
		return c.json({ error: "Not available on API domain" }, 404);
	}
	return next();
});

app.on(["POST", "GET"], "/api/auth/*", async (c) => {
	const authInstance = c.get("auth");
	if (!authInstance) throw new Error("Auth instance not found");
	return authInstance.handler(c.req.raw);
});

// REST API
app.route("/api/v1", restApiRouter);

// tRPC — only on app domain
app.use("/trpc/*", async (c, next) => {
	if (c.get("isApiDomain") && c.env.ENVIRONMENT === "production") {
		return c.json({ error: "tRPC is not available on API domain" }, 404);
	}

	const cf = c.req.raw.cf as
		| {
				country?: string;
				city?: string;
				region?: string;
				timezone?: string;
				isEUCountry?: "1";
		  }
		| undefined;

	return trpcServer({
		router: appRouter,
		createContext: (_opts, ctx) => ({
			session: ctx.get("session"),
			db: ctx.get("db"),
			env: ctx.env,
			geo: cf
				? {
						country: cf.country,
						city: cf.city,
						region: cf.region,
						timezone: cf.timezone,
						isEUCountry: cf.isEUCountry === "1",
					}
				: undefined,
		}),
	})(c, next);
});

// Root route
app.get("/", async (c) => {
	if (c.get("isApiDomain")) {
		return c.json({
			name: c.env.APP_NAME ?? "My SaaS API",
			version: "1.0.0",
			docs: "/api/v1/health",
		});
	}
	return c.env.ASSETS.fetch(c.req.raw);
});

// SPA fallback
app.notFound(async (c) => {
	if (c.get("isApiDomain")) {
		return c.json({ error: "Not Found" }, 404);
	}
	return c.env.ASSETS.fetch(c.req.raw);
});

// Cron handler — expired Better Auth verification + session rows
const scheduled = async (
	controller: ScheduledController,
	env: AppBindings["Bindings"],
	_ctx: ExecutionContext,
) => {
	console.log(`[CRON] ${controller.cron} at ${new Date().toISOString()}`);
	try {
		const db = initDb(env);
		await runScheduledCleanup(db);
	} catch (e) {
		console.error("[CRON] cleanup failed:", e);
	}
};

export type AppType = typeof app;

const workerHandler: ExportedHandler<AppBindings["Bindings"]> = {
	fetch(request, env, ctx) {
		return app.fetch(request, env, ctx);
	},
	scheduled,
};

export default Sentry.withSentry(
	(env: AppBindings["Bindings"]) =>
		env.SENTRY_DSN
			? {
					dsn: env.SENTRY_DSN,
					environment: env.ENVIRONMENT,
					tracesSampleRate: env.ENVIRONMENT === "production" ? 0.2 : 1.0,
					sendDefaultPii: false,
					integrations: [Sentry.honoIntegration()],
				}
			: undefined,
	workerHandler,
);
