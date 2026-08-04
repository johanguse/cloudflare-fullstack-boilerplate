import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const subscriptions = sqliteTable("subscriptions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	stripeSubscriptionId: text("stripe_subscription_id"),
	stripePriceId: text("stripe_price_id"),
	stripeProductId: text("stripe_product_id"),
	plan: text("plan", {
		enum: ["free", "starter", "professional", "business", "agency"],
	})
		.notNull()
		.default("free"),
	status: text("status", {
		enum: ["active", "inactive", "past_due", "canceled", "trialing", "paused"],
	})
		.notNull()
		.default("inactive"),
	currentPeriodStart: integer("current_period_start", { mode: "timestamp" }),
	currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
	cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
		.notNull()
		.default(false),
	creditBalance: integer("credit_balance").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export const creditTransactions = sqliteTable("credit_transactions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	amount: integer("amount").notNull(),
	type: text("type", {
		enum: [
			"purchase",
			"subscription_grant",
			"usage",
			"refund",
			"adjustment",
			"referral",
		],
	}).notNull(),
	description: text("description").notNull(),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	balanceAfter: integer("balance_after").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

export const creditPackages = sqliteTable("credit_packages", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	credits: integer("credits").notNull(),
	priceInCents: integer("price_in_cents").notNull(),
	stripePriceId: text("stripe_price_id"),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
	displayOrder: integer("display_order").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type CreditPackage = typeof creditPackages.$inferSelect;
export type NewCreditPackage = typeof creditPackages.$inferInsert;

// Processed Stripe webhook events — used to make webhook handling idempotent.
// Stripe guarantees at-least-once delivery and retries on any non-2xx, so every
// event id is recorded before its side effects run and rejected on redelivery.
export const webhookEvents = sqliteTable("webhook_events", {
	id: text("id").primaryKey(), // Stripe event.id
	type: text("type").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;

export const plans = [
	{ id: "free", name: "Free", creditsPerMonth: 50, priceInCents: 0 },
	{ id: "starter", name: "Starter", creditsPerMonth: 200, priceInCents: 499 },
	{
		id: "professional",
		name: "Professional",
		creditsPerMonth: 600,
		priceInCents: 1299,
	},
	{
		id: "business",
		name: "Business",
		creditsPerMonth: 1500,
		priceInCents: 2999,
	},
	{ id: "agency", name: "Agency", creditsPerMonth: 4000, priceInCents: 6999 },
] as const;

export type PlanId = (typeof plans)[number]["id"];
