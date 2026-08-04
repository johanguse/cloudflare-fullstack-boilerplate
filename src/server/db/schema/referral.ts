import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";

// Each user owns exactly one shareable referral code. The code doubles as the
// `/r/:code` link slug and can be customized by the user (validated against the
// shared slug rules).
export const referralCodes = sqliteTable("referral_codes", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	code: text("code").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type NewReferralCode = typeof referralCodes.$inferInsert;

// Attribution record created at signup: which referrer a new user came from.
// `referredUserId` is unique so a user can only ever be attributed to one
// referrer. Status advances pending -> rewarded | rejected once the referred
// user's first subscription payment is processed.
export const referrals = sqliteTable(
	"referrals",
	{
		id: text("id").primaryKey(),
		referrerUserId: text("referrer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		referredUserId: text("referred_user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
		code: text("code").notNull(),
		status: text("status", {
			enum: ["pending", "rewarded", "rejected"],
		})
			.notNull()
			.default("pending"),
		rejectionReason: text("rejection_reason"),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [index("idx_referrals_referrer").on(table.referrerUserId)],
);

export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;

// Idempotent reward ledger. One row per rewarded referral (`referralId` unique)
// guarantees a referral is only ever paid out once. `paymentIdentity` is unique
// across the whole table so the same paying identity (e.g. billing email) can
// only ever trigger a single referral reward — blocking duplicate-identity abuse.
export const referralRewards = sqliteTable(
	"referral_rewards",
	{
		id: text("id").primaryKey(),
		referralId: text("referral_id")
			.notNull()
			.unique()
			.references(() => referrals.id, { onDelete: "cascade" }),
		referrerUserId: text("referrer_user_id").notNull(),
		referredUserId: text("referred_user_id").notNull(),
		referrerCredits: integer("referrer_credits").notNull(),
		referredCredits: integer("referred_credits").notNull(),
		paymentIdentity: text("payment_identity").notNull(),
		stripePaymentIntentId: text("stripe_payment_intent_id"),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		uniqueIndex("idx_referral_rewards_payment_identity").on(
			table.paymentIdentity,
		),
		index("idx_referral_rewards_referrer").on(table.referrerUserId),
	],
);

export type ReferralReward = typeof referralRewards.$inferSelect;
export type NewReferralReward = typeof referralRewards.$inferInsert;
