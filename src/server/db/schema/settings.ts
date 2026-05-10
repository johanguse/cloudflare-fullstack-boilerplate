import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

/**
 * Per-user toggles for marketing / transactional emails (excluding auth security emails).
 */
export const userNotificationSettings = sqliteTable(
	"user_notification_settings",
	{
		userId: text("user_id")
			.primaryKey()
			.references(() => user.id, { onDelete: "cascade" }),

		notifyPaymentReceipt: integer("notify_payment_receipt", { mode: "boolean" })
			.notNull()
			.default(true),
		notifyInvoice: integer("notify_invoice", { mode: "boolean" })
			.notNull()
			.default(true),
		notifyNfseIssued: integer("notify_nfse_issued", { mode: "boolean" })
			.notNull()
			.default(true),
		notifyLowBalance: integer("notify_low_balance", { mode: "boolean" })
			.notNull()
			.default(true),
		notifySubscriptionChanged: integer("notify_subscription_changed", {
			mode: "boolean",
		})
			.notNull()
			.default(true),

		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
);

export const apiKeys = sqliteTable("api_keys", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	keyPrefix: text("key_prefix").notNull(),
	keyHash: text("key_hash").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
});

export type UserNotificationSettings =
	typeof userNotificationSettings.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
