import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "../../db/schema/auth";
import * as billingSchema from "../../db/schema/billing";
import { SUPPORTED_LOCALES } from "../../emails/i18n";
import { createAuth } from "../../lib/auth";
import { protectedProcedure, router } from "../../lib/trpc";
import { getBillingService } from "../../services/billing";

const DELETE_ACCOUNT_FRESH_SESSION_MS = 15 * 60 * 1000;

export const userRouter = router({
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		const session = ctx.session;
		const user = await ctx.db
			.select()
			.from(schema.user)
			.where(eq(schema.user.id, session.userId))
			.get();
		return {
			id: session.userId,
			name: user?.name ?? null,
			email: user?.email ?? null,
			image: user?.image ?? null,
			emailVerified: user?.emailVerified ?? false,
			locale: user?.locale ?? "en",
		};
	}),

	updateProfile: protectedProcedure
		.input(z.object({ name: z.string().min(1).max(100) }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(schema.user)
				.set({ name: input.name, updatedAt: new Date() })
				.where(eq(schema.user.id, ctx.session.userId));
			return { success: true };
		}),

	getRole: protectedProcedure.query(async ({ ctx }) => {
		const dbUser = await ctx.db
			.select({ role: schema.user.role })
			.from(schema.user)
			.where(eq(schema.user.id, ctx.session.userId))
			.get();
		return { role: dbUser?.role ?? "user" };
	}),

	updateLocale: protectedProcedure
		.input(
			z.object({ locale: z.enum(SUPPORTED_LOCALES as [string, ...string[]]) }),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(schema.user)
				.set({ locale: input.locale, updatedAt: new Date() })
				.where(eq(schema.user.id, ctx.session.userId));
			return { success: true };
		}),

	deleteAccount: protectedProcedure
		.input(z.object({ password: z.string().min(1).max(128).optional() }))
		.mutation(async ({ ctx, input }) => {
			if (input.password) {
				try {
					const auth = createAuth(ctx.db, ctx.env);
					await auth.api.verifyPassword({
						body: { password: input.password },
						headers: ctx.headers,
					});
				} catch (err) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Your current password could not be verified.",
						cause: err,
					});
				}
			} else if (
				Date.now() - new Date(ctx.session.createdAt).getTime() >
				DELETE_ACCOUNT_FRESH_SESSION_MS
			) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message:
						"For your security, enter your current password or sign in again before deleting your account.",
				});
			}

			// Cancel any active Stripe subscription first so a deleted account can
			// never keep getting billed. If cancellation fails we abort the delete so
			// the user can retry rather than silently leaving billing active.
			const sub = await ctx.db
				.select({
					stripeSubscriptionId:
						billingSchema.subscriptions.stripeSubscriptionId,
				})
				.from(billingSchema.subscriptions)
				.where(eq(billingSchema.subscriptions.userId, ctx.session.userId))
				.get();

			if (sub?.stripeSubscriptionId) {
				try {
					const billing = getBillingService(ctx.env.STRIPE_API_KEY);
					await billing.cancelSubscription(sub.stripeSubscriptionId);
				} catch (err) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message:
							"Could not cancel your active subscription. Please try again or contact support before deleting your account.",
						cause: err,
					});
				}
			}

			// Revoke all sessions so any other device/tab is immediately logged out.
			try {
				await ctx.db
					.delete(schema.session)
					.where(eq(schema.session.userId, ctx.session.userId));
			} catch (err) {
				console.error("[user] failed to revoke sessions on delete", err);
			}

			await ctx.db
				.delete(schema.user)
				.where(eq(schema.user.id, ctx.session.userId));
			return { success: true };
		}),
});
