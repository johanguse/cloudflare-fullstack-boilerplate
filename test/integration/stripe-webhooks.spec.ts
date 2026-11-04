import {
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { subscriptions } from "@server/db/schema/billing";
import type { AppBindings, AppEnv } from "@server/lib/types";
import { registerWebhookRoutes } from "@server/routers/rest/webhooks";
import { addCredits } from "@server/services/credits";
import { createInvoiceFromStripe } from "@server/services/invoices";
import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	STRIPE_API_VERSION,
	signStripePayload,
	WEBHOOK_SECRET,
} from "../fixtures/stripe";

// Exercise real signature verification and route dispatch; persistence and
// credit effects are stubbed so these checks cannot touch a database or provider.
vi.mock("@server/services/credits", () => ({
	addCredits: vi.fn(async () => {}),
}));
vi.mock("@server/services/invoices", () => ({
	createInvoiceFromStripe: vi.fn(async () => ({
		id: "invoice_local",
		amountTotal: 499,
		currency: "brl",
		customerEmail: null,
	})),
}));

const subscriptionRow = {
	userId: "user_local",
	stripeCustomerId: "cus_local",
	stripeSubscriptionId: null,
	plan: "starter",
};

function createRouteFixture() {
	const inserted: Array<{ table: unknown; values: Record<string, unknown> }> =
		[];
	const updated: Array<{ table: unknown; values: Record<string, unknown> }> =
		[];
	const db = {
		insert: (table: unknown) => ({
			values: (values: Record<string, unknown>) => {
				inserted.push({ table, values });
				return {
					onConflictDoNothing: () => ({
						returning: async () => [{ id: values.id }],
					}),
					onConflictDoUpdate: async () => {},
				};
			},
		}),
		update: (table: unknown) => ({
			set: (values: Record<string, unknown>) => {
				updated.push({ table, values });
				return { where: async () => {} };
			},
		}),
		select: () => ({
			from: () => ({ where: () => ({ get: async () => subscriptionRow }) }),
		}),
	};
	const app = new Hono<AppBindings>();
	app.use("*", async (c, next) => {
		c.set("db", db as never);
		await next();
	});
	registerWebhookRoutes(app);
	return { app, inserted, updated };
}

const env = {
	ENVIRONMENT: "production",
	STRIPE_API_KEY: "local-fixture-key",
	STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
	STRIPE_PRICE_STARTER: "price_local",
} as AppEnv;

async function deliver(app: Hono<AppBindings>, type: string, object: object) {
	const payload = JSON.stringify({
		id: "evt_local",
		object: "event",
		api_version: STRIPE_API_VERSION,
		type,
		data: { object },
	});
	const ctx = createExecutionContext();
	const response = await app.fetch(
		new Request("https://example.com/api/webhooks/stripe", {
			method: "POST",
			headers: { "stripe-signature": await signStripePayload(payload) },
			body: payload,
		}),
		env,
		ctx,
	);
	await waitOnExecutionContext(ctx);
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ received: true });
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => {
			throw new Error("Unexpected external request in webhook fixture");
		}),
	);
});
afterEach(() => vi.unstubAllGlobals());

describe("Endive subscription and invoice webhook dispatch", () => {
	it("reads subscription-item periods and grants checkout credits", async () => {
		const { app, inserted } = createRouteFixture();
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				Response.json({
					id: "sub_local",
					object: "subscription",
					items: {
						data: [
							{
								price: { id: "price_local" },
								current_period_start: 1_800_000_000,
								current_period_end: 1_802_592_000,
							},
						],
					},
				}),
			),
		);
		await deliver(app, "checkout.session.completed", {
			id: "cs_local",
			metadata: { userId: "user_local" },
			mode: "subscription",
			subscription: "sub_local",
			customer: "cus_local",
		});
		expect(
			inserted.find((write) => write.table === subscriptions)?.values,
		).toMatchObject({
			userId: "user_local",
			stripeSubscriptionId: "sub_local",
			plan: "starter",
			currentPeriodEnd: new Date(1_802_592_000_000),
		});
		expect(addCredits).toHaveBeenCalledWith(
			expect.anything(),
			"user_local",
			200,
			"subscription_grant",
			expect.any(String),
		);
	});

	it("updates subscription cancellation state and item period end", async () => {
		const { app, updated } = createRouteFixture();
		await deliver(app, "customer.subscription.updated", {
			id: "sub_local",
			metadata: { userId: "user_local" },
			status: "active",
			cancel_at_period_end: true,
			items: { data: [{ current_period_end: 1_802_592_000 }] },
		});
		expect(updated[0].values).toMatchObject({
			status: "active",
			cancelAtPeriodEnd: true,
			currentPeriodEnd: new Date(1_802_592_000_000),
		});
	});

	it("downgrades a deleted subscription", async () => {
		const { app, updated } = createRouteFixture();
		await deliver(app, "customer.subscription.deleted", {
			id: "sub_local",
			metadata: { userId: "user_local" },
		});
		expect(updated[0].values).toMatchObject({
			plan: "free",
			status: "inactive",
			stripeSubscriptionId: null,
		});
	});

	it("maps renewal invoice line pricing and grants the renewal credits", async () => {
		const { app } = createRouteFixture();
		await deliver(app, "invoice.payment_succeeded", {
			id: "in_local",
			customer: "cus_local",
			billing_reason: "subscription_cycle",
			amount_paid: 499,
			subtotal: 450,
			total: 499,
			total_excluding_tax: 450,
			currency: "brl",
			lines: {
				data: [
					{
						description: "Starter",
						quantity: 1,
						amount: 450,
						pricing: { unit_amount_decimal: "450" },
					},
				],
			},
		});
		expect(addCredits).toHaveBeenCalledWith(
			expect.anything(),
			"user_local",
			200,
			"subscription_grant",
			expect.any(String),
		);
		expect(createInvoiceFromStripe).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				stripeInvoiceId: "in_local",
				amountTax: 49,
				amountTotal: 499,
				lines: [
					{ description: "Starter", quantity: 1, unitAmount: 450, total: 450 },
				],
			}),
		);
	});
});
