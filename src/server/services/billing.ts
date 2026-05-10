import Stripe from "stripe";

function createStripeClient(secretKey: string): Stripe {
	return new Stripe(secretKey, {
		apiVersion: "2026-04-22.dahlia",
		httpClient: Stripe.createFetchHttpClient(),
	});
}

export function getBillingService(secretKey: string) {
	const stripe = createStripeClient(secretKey);

	return {
		stripe,

		async createCustomer(params: {
			email: string;
			name: string;
			userId: string;
		}) {
			return stripe.customers.create({
				email: params.email,
				name: params.name,
				metadata: { userId: params.userId },
			});
		},

		async createCheckoutSession(params: {
			customerId: string;
			priceId: string;
			successUrl: string;
			cancelUrl: string;
			mode: "subscription" | "payment";
			metadata?: Record<string, string>;
		}) {
			return stripe.checkout.sessions.create({
				customer: params.customerId,
				payment_method_types: ["card"],
				line_items: [{ price: params.priceId, quantity: 1 }],
				mode: params.mode,
				success_url: params.successUrl,
				cancel_url: params.cancelUrl,
				metadata: params.metadata,
				allow_promotion_codes: true,
			});
		},

		async createPortalSession(params: {
			customerId: string;
			returnUrl: string;
		}) {
			return stripe.billingPortal.sessions.create({
				customer: params.customerId,
				return_url: params.returnUrl,
			});
		},

		async getSubscription(subscriptionId: string) {
			return stripe.subscriptions.retrieve(subscriptionId);
		},

		async cancelSubscription(subscriptionId: string) {
			return stripe.subscriptions.update(subscriptionId, {
				cancel_at_period_end: true,
			});
		},

		async reactivateSubscription(subscriptionId: string) {
			return stripe.subscriptions.update(subscriptionId, {
				cancel_at_period_end: false,
			});
		},

		async listInvoices(customerId: string, limit = 10) {
			return stripe.invoices.list({ customer: customerId, limit });
		},

		async constructWebhookEvent(
			payload: string,
			signature: string,
			webhookSecret: string,
		): Promise<Stripe.Event> {
			return stripe.webhooks.constructEventAsync(
				payload,
				signature,
				webhookSecret,
			);
		},
	};
}

export type BillingService = ReturnType<typeof getBillingService>;
