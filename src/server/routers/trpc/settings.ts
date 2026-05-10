import { eq } from "drizzle-orm";
import { z } from "zod";
import * as settingsSchema from "../../db/schema/settings";
import { protectedProcedure, router } from "../../lib/trpc";

export const settingsRouter = router({
	getNotifications: protectedProcedure.query(async ({ ctx }) => {
		const row = await ctx.db
			.select()
			.from(settingsSchema.userNotificationSettings)
			.where(
				eq(settingsSchema.userNotificationSettings.userId, ctx.session.userId),
			)
			.get();

		return {
			notifyPaymentReceipt: row?.notifyPaymentReceipt ?? true,
			notifyInvoice: row?.notifyInvoice ?? true,
			notifyNfseIssued: row?.notifyNfseIssued ?? true,
			notifyLowBalance: row?.notifyLowBalance ?? true,
			notifySubscriptionChanged: row?.notifySubscriptionChanged ?? true,
		};
	}),

	updateNotifications: protectedProcedure
		.input(
			z.object({
				notifyPaymentReceipt: z.boolean().optional(),
				notifyInvoice: z.boolean().optional(),
				notifyNfseIssued: z.boolean().optional(),
				notifyLowBalance: z.boolean().optional(),
				notifySubscriptionChanged: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db
				.select()
				.from(settingsSchema.userNotificationSettings)
				.where(
					eq(
						settingsSchema.userNotificationSettings.userId,
						ctx.session.userId,
					),
				)
				.get();

			if (existing) {
				await ctx.db
					.update(settingsSchema.userNotificationSettings)
					.set({
						...input,
						updatedAt: new Date(),
					})
					.where(
						eq(
							settingsSchema.userNotificationSettings.userId,
							ctx.session.userId,
						),
					);
			} else {
				await ctx.db.insert(settingsSchema.userNotificationSettings).values({
					userId: ctx.session.userId,
					notifyPaymentReceipt: input.notifyPaymentReceipt ?? true,
					notifyInvoice: input.notifyInvoice ?? true,
					notifyNfseIssued: input.notifyNfseIssued ?? true,
					notifyLowBalance: input.notifyLowBalance ?? true,
					notifySubscriptionChanged: input.notifySubscriptionChanged ?? true,
				});
			}
			return { saved: true };
		}),
});
