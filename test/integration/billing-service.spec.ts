import { getBillingService } from "@server/services/billing";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	STRIPE_API_VERSION,
	signStripePayload,
	WEBHOOK_SECRET,
} from "../fixtures/stripe";

function mockStripeResponse(body: unknown) {
	const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
		Response.json(body, { headers: { "request-id": "req_local_fixture" } }),
	);
	vi.stubGlobal("fetch", fetch);
	return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("Stripe v23 billing requests", () => {
	it("creates hosted subscription checkout using the Endive API and dynamic payment methods", async () => {
		const fetch = mockStripeResponse({
			id: "cs_local",
			object: "checkout.session",
			url: "https://checkout.example.com/cs_local",
		});
		const billing = getBillingService("local-fixture-key");
		const checkout = await billing.createCheckoutSession({
			customerId: "cus_local",
			priceId: "price_local",
			mode: "subscription",
			successUrl: "https://example.com/billing?success=1",
			cancelUrl: "https://example.com/billing?canceled=1",
			metadata: { userId: "user_local" },
		});
		expect(checkout.url).toBe("https://checkout.example.com/cs_local");
		expect(fetch).toHaveBeenCalledTimes(1);
		const [url, init] = fetch.mock.calls[0];
		expect(String(url)).toBe("https://api.stripe.com/v1/checkout/sessions");
		expect(init?.method).toBe("POST");
		expect(new Headers(init?.headers).get("stripe-version")).toBe(
			STRIPE_API_VERSION,
		);
		const params = new URLSearchParams(String(init?.body));
		expect(params.get("mode")).toBe("subscription");
		expect(params.get("customer")).toBe("cus_local");
		expect(params.get("line_items[0][price]")).toBe("price_local");
		expect(params.get("line_items[0][quantity]")).toBe("1");
		expect(params.get("metadata[userId]")).toBe("user_local");
		expect(
			[...params.keys()].some((key) => key.startsWith("payment_method_types")),
		).toBe(false);
	});

	it("creates a portal session with the customer's return URL", async () => {
		const fetch = mockStripeResponse({
			id: "bps_local",
			url: "https://billing.example.com",
		});
		await getBillingService("local-fixture-key").createPortalSession({
			customerId: "cus_local",
			returnUrl: "https://example.com/billing",
		});
		const [url, init] = fetch.mock.calls[0];
		expect(String(url)).toBe(
			"https://api.stripe.com/v1/billing_portal/sessions",
		);
		const params = new URLSearchParams(String(init?.body));
		expect(params.get("customer")).toBe("cus_local");
		expect(params.get("return_url")).toBe("https://example.com/billing");
	});

	it.each([true, false])(
		"serializes cancel_at_period_end=%s",
		async (cancel) => {
			const fetch = mockStripeResponse({
				id: "sub_local",
				cancel_at_period_end: cancel,
			});
			const billing = getBillingService("local-fixture-key");
			if (cancel) await billing.cancelSubscription("sub_local");
			else await billing.reactivateSubscription("sub_local");
			const [url, init] = fetch.mock.calls[0];
			expect(String(url)).toBe(
				"https://api.stripe.com/v1/subscriptions/sub_local",
			);
			expect(
				new URLSearchParams(String(init?.body)).get("cancel_at_period_end"),
			).toBe(String(cancel));
		},
	);

	it("lists invoices for the requested customer", async () => {
		const fetch = mockStripeResponse({
			object: "list",
			data: [],
			has_more: false,
		});
		await getBillingService("local-fixture-key").listInvoices("cus_local", 5);
		const url = new URL(String(fetch.mock.calls[0][0]));
		expect(url.pathname).toBe("/v1/invoices");
		expect(url.searchParams.get("customer")).toBe("cus_local");
		expect(url.searchParams.get("limit")).toBe("5");
	});
});

describe("Stripe v23 webhook verification in Workers", () => {
	it.each(["2026-08-26.dahlia", STRIPE_API_VERSION])(
		"verifies signed %s snapshot events",
		async (apiVersion) => {
			const payload = JSON.stringify({
				id: "evt_local",
				object: "event",
				api_version: apiVersion,
				type: "customer.subscription.deleted",
				data: {
					object: { id: "sub_local", metadata: { userId: "user_local" } },
				},
			});
			const signature = await signStripePayload(payload);
			const event = await getBillingService(
				"local-fixture-key",
			).constructWebhookEvent(payload, signature, WEBHOOK_SECRET);
			expect(event.api_version).toBe(apiVersion);
			expect(event.type).toBe("customer.subscription.deleted");
			expect(event.data.object.id).toBe("sub_local");
		},
	);

	it("rejects modified payloads and expired signatures", async () => {
		const payload = JSON.stringify({
			id: "evt_local",
			type: "invoice.payment_succeeded",
		});
		const billing = getBillingService("local-fixture-key");
		const signature = await signStripePayload(payload);
		await expect(
			billing.constructWebhookEvent(`${payload} `, signature, WEBHOOK_SECRET),
		).rejects.toThrow();
		const expired = await signStripePayload(
			payload,
			Math.floor(Date.now() / 1000) - 600,
		);
		await expect(
			billing.constructWebhookEvent(payload, expired, WEBHOOK_SECRET),
		).rejects.toThrow();
	});
});
