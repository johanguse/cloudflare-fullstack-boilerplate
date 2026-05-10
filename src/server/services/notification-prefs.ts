import { eq } from "drizzle-orm";
import type { DBInstance } from "../db";
import * as settingsSchema from "../db/schema/settings";

export type NotificationPrefs = {
	notifyPaymentReceipt: boolean;
	notifyInvoice: boolean;
	notifyNfseIssued: boolean;
	notifyLowBalance: boolean;
	notifySubscriptionChanged: boolean;
};

const defaults: NotificationPrefs = {
	notifyPaymentReceipt: true,
	notifyInvoice: true,
	notifyNfseIssued: true,
	notifyLowBalance: true,
	notifySubscriptionChanged: true,
};

export async function getNotificationPrefs(
	db: DBInstance,
	userId: string,
): Promise<NotificationPrefs> {
	const row = await db
		.select()
		.from(settingsSchema.userNotificationSettings)
		.where(eq(settingsSchema.userNotificationSettings.userId, userId))
		.get();

	if (!row) return { ...defaults };

	return {
		notifyPaymentReceipt: row.notifyPaymentReceipt,
		notifyInvoice: row.notifyInvoice,
		notifyNfseIssued: row.notifyNfseIssued,
		notifyLowBalance: row.notifyLowBalance,
		notifySubscriptionChanged: row.notifySubscriptionChanged,
	};
}
