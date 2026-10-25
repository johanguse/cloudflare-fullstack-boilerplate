import { protectedProcedure, publicProcedure, router } from "@server/lib/trpc";
import { trpcServer } from "@server/lib/trpc-http";
import type { AppBindings, AppEnv } from "@server/lib/types";
import corsMiddleware from "@server/middlewares/corsMiddleware";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const testRouter = router({
	status: publicProcedure.query(({ ctx }) => ({
		environment: ctx.env.ENVIRONMENT,
		name: ctx.headers.get("x-fixture-name"),
	})),
	version: publicProcedure.query(() => "local-test"),
	echo: publicProcedure
		.input(z.object({ message: z.string().min(1) }))
		.mutation(({ input }) => input),
	private: protectedProcedure.query(({ ctx }) => ctx.session.userId),
});

const fixtureEnv = {
	ENVIRONMENT: "test",
	TRUSTED_ORIGINS: "https://frontend.example.com",
} as AppEnv;

function createFixture() {
	const app = new Hono<AppBindings>();
	app.use("*", corsMiddleware);
	app.use("*", secureHeaders());
	app.use("*", async (c, next) => {
		c.header("x-from-hono", "preserved");
		await next();
	});
	// Match the app's dynamic adapter invocation. Reading a POST body first also
	// verifies that the adapter uses Hono's cached body rather than consuming twice.
	app.use("/trpc/*", async (c, next) => {
		if (c.req.method === "POST") await c.req.json();
		return trpcServer({
			router: testRouter,
			createContext: ({ resHeaders }, context) => {
				resHeaders.set("set-cookie", "fixture=1; Path=/; HttpOnly");
				return {
					session: null,
					db: null,
					env: context.env,
					headers: context.req.raw.headers,
				};
			},
		})(c, next);
	});
	const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
		app.fetch(new Request(input, init), fixtureEnv),
	);
	const client = createTRPCClient<typeof testRouter>({
		links: [httpBatchLink({ url: "https://example.com/trpc", fetch })],
	});
	return { app, client, fetch };
}

describe("Hono tRPC 0.4 HTTP adapter", () => {
	it("detects /trpc and propagates context, response cookies and Hono headers", async () => {
		const { app } = createFixture();
		const response = await app.request(
			"/trpc/status",
			{
				headers: {
					"x-fixture-name": "Ada",
					origin: "https://frontend.example.com",
				},
			},
			fixtureEnv,
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			result: { data: { environment: "test", name: "Ada" } },
		});
		expect(response.headers.get("x-from-hono")).toBe("preserved");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("access-control-allow-origin")).toBe(
			"https://frontend.example.com",
		);
		expect(response.headers.get("access-control-allow-credentials")).toBe(
			"true",
		);
		expect(response.headers.get("set-cookie")).toBe(
			"fixture=1; Path=/; HttpOnly",
		);
	});

	it("handles httpBatchLink queries in one HTTP request", async () => {
		const { client, fetch } = createFixture();
		const [status, version] = await Promise.all([
			client.status.query(),
			client.version.query(),
		]);
		expect(status.environment).toBe("test");
		expect(version).toBe("local-test");
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("handles batched POST mutations after Hono has parsed the request body", async () => {
		const { client } = createFixture();
		expect(await client.echo.mutate({ message: "Local fixture" })).toEqual({
			message: "Local fixture",
		});
	});

	it("retains HTTP 401 and the tRPC UNAUTHORIZED error for protected procedures", async () => {
		const { app } = createFixture();
		const response = await app.request(
			"/trpc/private",
			{
				headers: { origin: "https://frontend.example.com" },
			},
			fixtureEnv,
		);
		expect(response.status).toBe(401);
		expect(response.headers.get("access-control-allow-origin")).toBe(
			"https://frontend.example.com",
		);
		expect(await response.json()).toMatchObject({
			error: { data: { code: "UNAUTHORIZED" } },
		});
	});
});
