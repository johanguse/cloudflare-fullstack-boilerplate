import { and, eq, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { DBInstance } from "../db";
import * as userSchema from "../db/schema/auth";
import * as schema from "../db/schema/billing";
import type { AppConfig } from "../lib/config";
import type { AppEnv } from "../lib/types";
import { sendLowBalanceEmail } from "./email";
import { getNotificationPrefs } from "./notification-prefs";
import { getUserLocale } from "./user-locale";

export const LOW_CREDIT_NOTIFY_THRESHOLD = 10;

export async function getBalance(
	db: DBInstance,
	userId: string,
): Promise<number> {
	const sub = await db
		.select({ balance: schema.subscriptions.creditBalance })
		.from(schema.subscriptions)
		.where(eq(schema.subscriptions.userId, userId))
		.get();
	return sub?.balance ?? 0;
}

export async function hasEnoughCredits(
	db: DBInstance,
	userId: string,
	required: number,
): Promise<boolean> {
	const balance = await getBalance(db, userId);
	return balance >= required;
}

export async function addCredits(
	db: DBInstance,
	userId: string,
	amount: number,
	type: schema.NewCreditTransaction["type"],
	description: string,
	stripePaymentIntentId?: string,
): Promise<void> {
	await db.transaction(async (tx) => {
		let sub = await tx
			.select()
			.from(schema.subscriptions)
			.where(eq(schema.subscriptions.userId, userId))
			.get();

		if (!sub) {
			const newSub: schema.NewSubscription = {
				id: nanoid(),
				userId,
				stripeCustomerId: "",
				creditBalance: amount,
			};
			await tx.insert(schema.subscriptions).values(newSub);
			sub = await tx
				.select()
				.from(schema.subscriptions)
				.where(eq(schema.subscriptions.userId, userId))
				.get();
		} else {
			await tx
				.update(schema.subscriptions)
				.set({
					creditBalance: sql`credit_balance + ${amount}`,
					updatedAt: new Date(),
				})
				.where(eq(schema.subscriptions.userId, userId));
		}

		const balanceAfter = (sub?.creditBalance ?? 0) + amount;

		await tx.insert(schema.creditTransactions).values({
			id: nanoid(),
			userId,
			amount,
			type,
			description,
			stripePaymentIntentId: stripePaymentIntentId ?? null,
			balanceAfter,
		});
	});
}

export async function deductCredits(
	db: DBInstance,
	userId: string,
	amount: number,
	description: string,
	notify?: { env: AppEnv; config: AppConfig },
): Promise<{ success: boolean; balanceAfter: number }> {
	// Debit atomically with a guarded UPDATE so concurrent deductions cannot
	// both read the same balance and overwrite each other (lost update). The
	// `credit_balance >= amount` predicate ensures we never go negative, and the
	// RETURNING clause gives us the authoritative post-debit balance.
	const balanceBefore = await getBalance(db, userId);

	const { newBalance, applied } = await db.transaction(async (tx) => {
		const updated = await tx
			.update(schema.subscriptions)
			.set({
				creditBalance: sql`credit_balance - ${amount}`,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(schema.subscriptions.userId, userId),
					gte(schema.subscriptions.creditBalance, amount),
				),
			)
			.returning({ creditBalance: schema.subscriptions.creditBalance });

		const row = updated[0];
		if (!row) {
			// Not enough credits (or no subscription row) — nothing was debited.
			return { newBalance: balanceBefore, applied: false };
		}

		await tx.insert(schema.creditTransactions).values({
			id: nanoid(),
			userId,
			amount: -amount,
			type: "usage",
			description,
			balanceAfter: row.creditBalance,
		});

		return { newBalance: row.creditBalance, applied: true };
	});

	if (!applied) {
		return { success: false, balanceAfter: balanceBefore };
	}

	if (notify) {
		if (
			newBalance <= LOW_CREDIT_NOTIFY_THRESHOLD &&
			balanceBefore > LOW_CREDIT_NOTIFY_THRESHOLD
		) {
			const [prefs, u, locale] = await Promise.all([
				getNotificationPrefs(db, userId),
				db
					.select({ email: userSchema.user.email })
					.from(userSchema.user)
					.where(eq(userSchema.user.id, userId))
					.get(),
				getUserLocale(db, userId),
			]);
			if (prefs.notifyLowBalance && u?.email) {
				try {
					await sendLowBalanceEmail(
						notify.env,
						notify.config,
						u.email,
						newBalance,
						LOW_CREDIT_NOTIFY_THRESHOLD,
						locale,
					);
				} catch (e) {
					console.error("[credits] low balance email failed", e);
				}
			}
		}
	}

	return { success: true, balanceAfter: newBalance };
}
