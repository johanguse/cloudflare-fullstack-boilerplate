import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { nanoid } from "nanoid";
import type Stripe from "stripe";
import * as authSchema from "../../db/schema/auth";
import * as billingSchema from "../../db/schema/billing";
import { plans } from "../../db/schema/billing";
import * as nfseSchema from "../../db/schema/nfse";
import { createAppConfig } from "../../lib/config";
import type { AppBindings } from "../../lib/types";
import { getBillingService } from "../../services/billing";
import { addCredits } from "../../services/credits";
import {
	sendInvoiceNotificationEmail,
	sendPaymentReceiptEmail,
	sendSubscriptionChangedEmail,
} from "../../services/email";
import { createInvoiceFromStripe } from "../../services/invoices";
import { getNotificationPrefs } from "../../services/notification-prefs";

export function registerWebhookRoutes(app: Hono<AppBindings>) {
	app.post("/api/webhooks/stripe", async (c) => {
		const signature = c.req.header("stripe-signature");
		if (!signature) {
			return c.json({ error: "Missing stripe-signature header" }, 400);
		}

		const rawBody = await c.req.text();
		const billing = getBillingService(c.env.STRIPE_API_KEY);
		const db = c.get("db");

		let event: Stripe.Event;
		try {
			event = await billing.constructWebhookEvent(
				rawBody,
				signature,
				c.env.STRIPE_WEBHOOK_SECRET,
			);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Webhook signature verification failed";
			return c.json({ error: message }, 400);
		}

		const env = c.env as unknown as Record<string, string>;

		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				const userId = session.metadata?.userId;
				if (!userId) break;

				if (session.mode === "subscription" && session.subscription) {
					const stripeSubscription = await billing.getSubscription(
						session.subscription as string,
					);
					const priceId = stripeSubscription.items.data[0]?.price.id;
					const plan = plans.find(
						(p) => env[`STRIPE_PRICE_${p.id.toUpperCase()}`] === priceId,
					);

					const periodStart = (
						stripeSubscription as unknown as Record<string, unknown>
					).current_period_start as number | undefined;
					const periodEnd = (
						stripeSubscription as unknown as Record<string, unknown>
					).current_period_end as number | undefined;

					await db
						.insert(billingSchema.subscriptions)
						.values({
							id: crypto.randomUUID(),
							userId,
							stripeCustomerId: session.customer as string,
							stripeSubscriptionId: stripeSubscription.id,
							stripePriceId: priceId ?? null,
							plan: plan?.id ?? "starter",
							status: "active",
							currentPeriodStart: periodStart
								? new Date(periodStart * 1000)
								: undefined,
							currentPeriodEnd: periodEnd
								? new Date(periodEnd * 1000)
								: undefined,
						})
						.onConflictDoUpdate({
							target: billingSchema.subscriptions.userId,
							set: {
								stripeCustomerId: session.customer as string,
								stripeSubscriptionId: stripeSubscription.id,
								stripePriceId: priceId ?? null,
								plan: plan?.id ?? "starter",
								status: "active",
								currentPeriodStart: periodStart
									? new Date(periodStart * 1000)
									: undefined,
								currentPeriodEnd: periodEnd
									? new Date(periodEnd * 1000)
									: undefined,
								updatedAt: new Date(),
							},
						});

					const creditsToGrant = plan?.creditsPerMonth ?? 200;
					await addCredits(
						db,
						userId,
						creditsToGrant,
						"subscription_grant",
						`${plan?.name ?? "Starter"} plan monthly credits`,
					);
				}
				break;
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				const userId = subscription.metadata?.userId;
				if (!userId) break;

				const subPeriodEnd = (
					subscription as unknown as Record<string, unknown>
				).current_period_end as number | undefined;

				await db
					.update(billingSchema.subscriptions)
					.set({
						status: subscription.status === "active" ? "active" : "inactive",
						cancelAtPeriodEnd: subscription.cancel_at_period_end,
						currentPeriodEnd: subPeriodEnd
							? new Date(subPeriodEnd * 1000)
							: undefined,
						updatedAt: new Date(),
					})
					.where(eq(billingSchema.subscriptions.userId, userId));

				c.executionCtx.waitUntil(
					(async () => {
						try {
							const appCfg = createAppConfig(c.env);
							const prefs = await getNotificationPrefs(db, userId);
							const owner = await db
								.select({ email: authSchema.user.email })
								.from(authSchema.user)
								.where(eq(authSchema.user.id, userId))
								.get();
							if (owner?.email && prefs.notifySubscriptionChanged) {
								const msg = subscription.cancel_at_period_end
									? "Your subscription is set to cancel at the end of the billing period."
									: `Your subscription status is now "${subscription.status}".`;
								await sendSubscriptionChangedEmail(
									c.env,
									appCfg,
									owner.email,
									msg,
								);
							}
						} catch (e) {
							console.error("[email] subscription.updated", e);
						}
					})(),
				);
				break;
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				const userId = subscription.metadata?.userId;
				if (!userId) break;

				await db
					.update(billingSchema.subscriptions)
					.set({
						plan: "free",
						status: "inactive",
						stripeSubscriptionId: null,
						stripePriceId: null,
						cancelAtPeriodEnd: false,
						updatedAt: new Date(),
					})
					.where(eq(billingSchema.subscriptions.userId, userId));

				c.executionCtx.waitUntil(
					(async () => {
						try {
							const appCfg = createAppConfig(c.env);
							const prefs = await getNotificationPrefs(db, userId);
							const owner = await db
								.select({ email: authSchema.user.email })
								.from(authSchema.user)
								.where(eq(authSchema.user.id, userId))
								.get();
							if (owner?.email && prefs.notifySubscriptionChanged) {
								await sendSubscriptionChangedEmail(
									c.env,
									appCfg,
									owner.email,
									"Your subscription has ended and your plan is now Free.",
								);
							}
						} catch (e) {
							console.error("[email] subscription.deleted", e);
						}
					})(),
				);
				break;
			}

			case "invoice.payment_succeeded": {
				const stripeInvoice = event.data.object as Stripe.Invoice;

				// Find user via Stripe customer
				const customerId = stripeInvoice.customer as string;
				const sub = await db
					.select()
					.from(billingSchema.subscriptions)
					.where(eq(billingSchema.subscriptions.stripeCustomerId, customerId))
					.get();

				if (sub) {
					// Grant renewal credits for subscription cycles
					if (stripeInvoice.billing_reason === "subscription_cycle") {
						const plan = plans.find((p) => p.id === sub.plan);
						if (plan) {
							const paymentIntent = (
								stripeInvoice as unknown as Record<string, unknown>
							).payment_intent as string | undefined;
							await addCredits(
								db,
								sub.userId,
								plan.creditsPerMonth,
								"subscription_grant",
								`${plan.name} plan renewal credits`,
								paymentIntent,
							);
						}
					}

					// Auto-create an internal invoice record for every paid Stripe invoice
					const invoiceRaw = stripeInvoice as unknown as Record<
						string,
						unknown
					>;
					const stripeInvoiceId = stripeInvoice.id;
					if (stripeInvoiceId) {
						const lines: Array<{
							description: string;
							quantity: number;
							unitAmount: number;
							total: number;
						}> = [];

						const linesData = invoiceRaw.lines as
							| { data: Array<Record<string, unknown>> }
							| undefined;
						if (linesData?.data) {
							for (const line of linesData.data) {
								lines.push({
									description: (line.description as string | null) ?? "Service",
									quantity: (line.quantity as number | null) ?? 1,
									unitAmount:
										(line.unit_amount_excluding_tax as number | null) ?? 0,
									total: (line.amount as number | null) ?? 0,
								});
							}
						}

						const invoice = await createInvoiceFromStripe(db, {
							stripeInvoiceId,
							userId: sub.userId,
							amountSubtotal: (invoiceRaw.subtotal as number | null) ?? 0,
							amountTax: (invoiceRaw.tax as number | null) ?? 0,
							amountTotal: (invoiceRaw.amount_paid as number | null) ?? 0,
							currency: (stripeInvoice.currency as string | null) ?? "brl",
							customerName:
								(stripeInvoice.customer_name as string | null) ?? null,
							customerEmail:
								(stripeInvoice.customer_email as string | null) ?? null,
							description: (stripeInvoice.description as string | null) ?? null,
							lines,
							paidAt: new Date(),
						});

						// Queue NFSe generation as a background Trigger.dev task
						// Uses ctx.waitUntil so the webhook returns 200 immediately
						const nfseRecordId = nanoid();
						c.executionCtx.waitUntil(
							(async () => {
								try {
									const appCfg = createAppConfig(c.env);
									const planMeta = plans.find((p) => p.id === sub.plan);
									const [prefs, owner] = await Promise.all([
										getNotificationPrefs(db, sub.userId),
										db
											.select({ email: authSchema.user.email })
											.from(authSchema.user)
											.where(eq(authSchema.user.id, sub.userId))
											.get(),
									]);

									if (owner?.email && prefs.notifyPaymentReceipt) {
										await sendPaymentReceiptEmail(
											c.env,
											appCfg,
											owner.email,
											invoice.amountTotal,
											invoice.currency,
											planMeta?.name,
										);
									}
									if (invoice.customerEmail && prefs.notifyInvoice) {
										await sendInvoiceNotificationEmail(
											c.env,
											appCfg,
											invoice.customerEmail,
											{
												invoiceNumber: invoice.number,
												amountCents: invoice.amountTotal,
												currency: invoice.currency,
												invoiceId: invoice.id,
											},
										);
									}
								} catch (err) {
									console.error("[email] invoice.payment_succeeded", err);
								}

								try {
									await db.insert(nfseSchema.nfseRecords).values({
										id: nfseRecordId,
										invoiceId: invoice.id,
										userId: sub.userId,
										status: "pending",
									});

									const { tasks } = await import("@trigger.dev/sdk");
									await tasks.trigger("nfse-generation", {
										invoiceId: invoice.id,
										nfseRecordId,
										internalApiKey: c.env.INTERNAL_API_KEY,
										internalApiUrl: c.env.APP_URL,
										fiscalNacionalApiKey: c.env.FISCAL_NACIONAL_API_KEY,
										fiscalNacionalEnvironment:
											(c.env.FISCAL_NACIONAL_ENVIRONMENT as
												| "staging"
												| "production") ?? "staging",
									});
								} catch (err) {
									console.error("[nfse] Failed to queue NFSe task:", err);
								}
							})(),
						);
					}
				}
				break;
			}

			default:
				break;
		}

		return c.json({ received: true });
	});
}
