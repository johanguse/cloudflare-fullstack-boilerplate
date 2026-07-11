import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { nanoid } from "nanoid";
import type Stripe from "stripe";
import * as authSchema from "../../db/schema/auth";
import * as billingSchema from "../../db/schema/billing";
import { plans } from "../../db/schema/billing";
import * as nfseSchema from "../../db/schema/nfse";
import { getEmailT } from "../../emails/i18n";
import { createAppConfig } from "../../lib/config";
import type { AppBindings } from "../../lib/types";
import { getBillingService } from "../../services/billing";
import { addCredits } from "../../services/credits";
import { resolveForeignCurrencyAmount } from "../../services/currency-conversion";
import {
	sendInvoiceNotificationEmail,
	sendPaymentReceiptEmail,
	sendSubscriptionChangedEmail,
} from "../../services/email";
import { createInvoiceFromStripe } from "../../services/invoices";
import { getNotificationPrefs } from "../../services/notification-prefs";
import { getUserLocale } from "../../services/user-locale";

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

		// Idempotency guard: Stripe delivers at-least-once and retries on any
		// non-2xx, so record the event id before running side effects and skip
		// anything we've already processed. INSERT ... ON CONFLICT DO NOTHING is
		// atomic, so concurrent redeliveries cannot both proceed.
		const inserted = await db
			.insert(billingSchema.webhookEvents)
			.values({ id: event.id, type: event.type })
			.onConflictDoNothing()
			.returning({ id: billingSchema.webhookEvents.id });

		if (inserted.length === 0) {
			return c.json({ received: true, duplicate: true });
		}

		const planPriceMap: Record<string, Array<string | undefined>> = {
			starter: [c.env.STRIPE_PRICE_STARTER, c.env.STRIPE_PRICE_STARTER_ANNUAL],
			professional: [
				c.env.STRIPE_PRICE_PROFESSIONAL,
				c.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
			],
			business: [
				c.env.STRIPE_PRICE_BUSINESS,
				c.env.STRIPE_PRICE_BUSINESS_ANNUAL,
			],
			agency: [c.env.STRIPE_PRICE_AGENCY, c.env.STRIPE_PRICE_AGENCY_ANNUAL],
		};

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
					const plan = priceId
						? plans.find((p) => planPriceMap[p.id]?.includes(priceId))
						: undefined;

					const firstItem = stripeSubscription.items.data[0];
					const periodStart = firstItem?.current_period_start ?? 0;
					const periodEnd = firstItem?.current_period_end ?? 0;

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
							currentPeriodStart: new Date(periodStart * 1000),
							currentPeriodEnd: new Date(periodEnd * 1000),
						})
						.onConflictDoUpdate({
							target: billingSchema.subscriptions.userId,
							set: {
								stripeCustomerId: session.customer as string,
								stripeSubscriptionId: stripeSubscription.id,
								stripePriceId: priceId ?? null,
								plan: plan?.id ?? "starter",
								status: "active",
								currentPeriodStart: new Date(periodStart * 1000),
								currentPeriodEnd: new Date(periodEnd * 1000),
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

				await db
					.update(billingSchema.subscriptions)
					.set({
						status: subscription.status === "active" ? "active" : "inactive",
						cancelAtPeriodEnd: subscription.cancel_at_period_end,
						currentPeriodEnd: new Date(
							(subscription.items.data[0]?.current_period_end ?? 0) * 1000,
						),
						updatedAt: new Date(),
					})
					.where(eq(billingSchema.subscriptions.userId, userId));

				c.executionCtx.waitUntil(
					(async () => {
						try {
							const appCfg = createAppConfig(c.env);
							const [prefs, owner, locale] = await Promise.all([
								getNotificationPrefs(db, userId),
								db
									.select({ email: authSchema.user.email })
									.from(authSchema.user)
									.where(eq(authSchema.user.id, userId))
									.get(),
								getUserLocale(db, userId),
							]);
							if (owner?.email && prefs.notifySubscriptionChanged) {
								const t = getEmailT(locale);
								const msg = subscription.cancel_at_period_end
									? t.subscriptionChanged.cancelAtPeriodEnd
									: t.subscriptionChanged.statusChanged(subscription.status);
								await sendSubscriptionChangedEmail(
									c.env,
									appCfg,
									owner.email,
									msg,
									locale,
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
							const [prefs, owner, locale] = await Promise.all([
								getNotificationPrefs(db, userId),
								db
									.select({ email: authSchema.user.email })
									.from(authSchema.user)
									.where(eq(authSchema.user.id, userId))
									.get(),
								getUserLocale(db, userId),
							]);
							if (owner?.email && prefs.notifySubscriptionChanged) {
								const t = getEmailT(locale);
								await sendSubscriptionChangedEmail(
									c.env,
									appCfg,
									owner.email,
									t.subscriptionChanged.deleted,
									locale,
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
							await addCredits(
								db,
								sub.userId,
								plan.creditsPerMonth,
								"subscription_grant",
								`${plan.name} plan renewal credits`,
							);
						}
					}

					// Resolve foreign currency data via adaptive pricing presentment details
					let foreignCurrencyCode: string | null = null;
					let foreignCurrencyAmount: number | null = null;
					let customerCountryIso2: string | null = null;
					if (sub.stripeSubscriptionId) {
						const stripeSub = await billing.stripe.subscriptions.retrieve(
							sub.stripeSubscriptionId,
						);
						const presentmentCurrency =
							stripeSub.presentment_details?.presentment_currency;
						if (presentmentCurrency && presentmentCurrency !== "brl") {
							const result = await resolveForeignCurrencyAmount({
								presentmentCurrency,
								amountBrl: stripeInvoice.amount_paid,
								stripeInvoiceId: stripeInvoice.id,
								stripe: billing.stripe,
							});
							foreignCurrencyCode = result.foreignCurrencyCode;
							foreignCurrencyAmount = result.foreignCurrencyAmount;
							customerCountryIso2 = result.customerCountryIso2;
						}
					}

					// Auto-create an internal invoice record for every paid Stripe invoice
					const stripeInvoiceId = stripeInvoice.id;
					if (stripeInvoiceId) {
						const lines: Array<{
							description: string;
							quantity: number;
							unitAmount: number;
							total: number;
						}> = [];

						for (const line of stripeInvoice.lines.data) {
							lines.push({
								description: line.description ?? "Service",
								quantity: line.quantity ?? 1,
								unitAmount: Number(line.pricing?.unit_amount_decimal) || 0,
								total: line.amount,
							});
						}

						const amountTax =
							stripeInvoice.total_excluding_tax != null
								? stripeInvoice.total - stripeInvoice.total_excluding_tax
								: 0;

						const invoice = await createInvoiceFromStripe(db, {
							stripeInvoiceId,
							userId: sub.userId,
							amountSubtotal: stripeInvoice.subtotal,
							amountTax,
							amountTotal: stripeInvoice.amount_paid,
							currency: stripeInvoice.currency,
							customerName: stripeInvoice.customer_name,
							customerEmail: stripeInvoice.customer_email,
							description: stripeInvoice.description,
							foreignCurrencyCode,
							foreignCurrencyAmount,
							customerCountryIso2,
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
									const [prefs, owner, locale] = await Promise.all([
										getNotificationPrefs(db, sub.userId),
										db
											.select({ email: authSchema.user.email })
											.from(authSchema.user)
											.where(eq(authSchema.user.id, sub.userId))
											.get(),
										getUserLocale(db, sub.userId),
									]);

									if (owner?.email && prefs.notifyPaymentReceipt) {
										await sendPaymentReceiptEmail(
											c.env,
											appCfg,
											owner.email,
											invoice.amountTotal,
											invoice.currency,
											planMeta?.name,
											locale,
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
												locale,
											},
										);
									}
								} catch (err) {
									console.error("[email] invoice.payment_succeeded", err);
								}

								try {
									// Only queue NFSe once per invoice — guards against
									// duplicate fiscal documents if this block runs twice.
									const existingNfse = await db
										.select({ id: nfseSchema.nfseRecords.id })
										.from(nfseSchema.nfseRecords)
										.where(eq(nfseSchema.nfseRecords.invoiceId, invoice.id))
										.get();

									if (!existingNfse) {
										await db.insert(nfseSchema.nfseRecords).values({
											id: nfseRecordId,
											invoiceId: invoice.id,
											userId: sub.userId,
											status: "pending",
										});

										await c.env.NFSE_WORKFLOW.create({
											id: nfseRecordId,
											params: { invoiceId: invoice.id, nfseRecordId },
										});
									}
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
