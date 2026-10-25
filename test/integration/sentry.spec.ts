import {
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { type Envelope, type Event, withSentry } from "@sentry/cloudflare";
import { sentry } from "@sentry/hono/cloudflare";
import { getSentryOptions } from "@server/lib/sentry";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";

function createTestWorker() {
	const envelopes: Envelope[] = [];
	const options = (env: Parameters<typeof getSentryOptions>[0]) => ({
		...getSentryOptions(env),
		tracesSampleRate: 0,
		transport: () => ({
			send: async (envelope: Envelope) => {
				envelopes.push(envelope);
				return { statusCode: 200 };
			},
			flush: async () => true,
		}),
	});
	const app = new Hono<{
		Bindings: Parameters<typeof getSentryOptions>[0];
	}>();
	app.use("*", sentry(app, options));
	app.onError((_error, c) => c.json({ error: "Internal Server Error" }, 500));
	app.get("/health", (c) => c.json({ status: "ok" }));
	app.post("/failure", () => {
		throw new Error("sentry-migration-test");
	});
	const fetch = app.fetch;
	const worker = withSentry(options, { fetch, scheduled: async () => {} });
	return { worker, envelopes, fetch };
}

describe("Sentry Cloudflare v11", () => {
	it("captures handled Hono errors once without collecting private request data", async () => {
		const { worker, envelopes, fetch } = createTestWorker();
		expect(worker.fetch).toBe(fetch);
		const ctx = createExecutionContext();
		const response = await worker.fetch(
			new Request("https://example.com/failure?forwarded=dummy-private-query", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					cookie: "session=dummy-private-cookie",
					"x-forwarded-for": "192.0.2.1",
				},
				body: JSON.stringify({ value: "dummy-private-body" }),
			}),
			{
				ENVIRONMENT: "production",
				SENTRY_DSN: "https://public@example.invalid/1",
			},
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "Internal Server Error" });
		const events = envelopes.flatMap(([, items]) =>
			items
				.filter(([header]) => header.type === "event")
				.map(([, event]) => event as Event),
		);
		expect(events).toHaveLength(1);
		expect(events[0].exception?.values?.[0].value).toBe(
			"sentry-migration-test",
		);
		expect(events[0].user).toBeUndefined();
		expect(events[0].request?.data).toBeUndefined();
		expect(events[0].request?.cookies).toBeUndefined();
		const serialized = JSON.stringify(events[0]);
		for (const privateValue of [
			"dummy-private-query",
			"dummy-private-cookie",
			"dummy-private-body",
			"192.0.2.1",
		]) {
			expect(serialized).not.toContain(privateValue);
		}
	});

	it("serves requests with Sentry disabled when no DSN is configured", async () => {
		const { worker, envelopes } = createTestWorker();
		const ctx = createExecutionContext();
		const response = await worker.fetch(
			new Request("https://example.com/health"),
			{ ENVIRONMENT: "production" },
			ctx,
		);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
		expect(envelopes).toHaveLength(0);
	});
});
