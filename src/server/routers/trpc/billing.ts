import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as authSchema from "../../db/schema/auth";
import * as billingSchema from "../../db/schema/billing";
import { protectedProcedure, router } from "../../lib/trpc";
import { getBillingService } from "../../services/billing";
import { getBalance } from "../../services/credits";

export const billingRouter = router({
	getSubscription: protectedProcedure.query(async ({ ctx }) => {
		const [sub, balance] = await Promise.all([
			ctx.db
				.select()
				.from(billingSchema.subscriptions)
				.where(eq(billingSchema.subscriptions.userId, ctx.session.userId))
				.get(),
			getBalance(ctx.db, ctx.session.userId),
		]);

		return {
			plan: sub?.plan ?? "free",
			status: sub?.status ?? "inactive",
			creditBalance: balance,
			currentPeriodEnd: sub?.currentPeriodEnd ?? null,
			cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
			stripeSubscriptionId: sub?.stripeSubscriptionId ?? null,
		};
	}),

	getBalance: protectedProcedure.query(async ({ ctx }) => {
		const balance = await getBalance(ctx.db, ctx.session.userId);
		return { balance };
	}),

	getHistory: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select()
				.from(billingSchema.creditTransactions)
				.where(eq(billingSchema.creditTransactions.userId, ctx.session.userId))
				.orderBy(desc(billingSchema.creditTransactions.createdAt))
				.limit(input.limit)
				.offset(input.offset)
				.all();
			return rows;
		}),

	createCheckoutSession: protectedProcedure
		.input(z.object({ priceId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			// Only allow prices we actually sell. Without this, a caller could pass
			// any Stripe price id (hidden/test/discounted) and the webhook would
			// happily activate a plan for it.
			const priceEnv: Array<string | undefined> = [
				ctx.env.STRIPE_PRICE_STARTER,
				ctx.env.STRIPE_PRICE_STARTER_ANNUAL,
				ctx.env.STRIPE_PRICE_PROFESSIONAL,
				ctx.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL,
				ctx.env.STRIPE_PRICE_BUSINESS,
				ctx.env.STRIPE_PRICE_BUSINESS_ANNUAL,
				ctx.env.STRIPE_PRICE_AGENCY,
				ctx.env.STRIPE_PRICE_AGENCY_ANNUAL,
			];
			const allowedPriceIds = new Set(
				priceEnv.filter((p): p is string => Boolean(p)),
			);

			if (!allowedPriceIds.has(input.priceId)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Unknown plan price",
				});
			}

			const billing = getBillingService(ctx.env.STRIPE_API_KEY);
			const userRow = await ctx.db
				.select({ email: authSchema.user.email, name: authSchema.user.name })
				.from(authSchema.user)
				.where(eq(authSchema.user.id, ctx.session.userId))
				.get();

			const sub = await ctx.db
				.select()
				.from(billingSchema.subscriptions)
				.where(eq(billingSchema.subscriptions.userId, ctx.session.userId))
				.get();

			let customerId = sub?.stripeCustomerId;
			if (!customerId) {
				const customer = await billing.createCustomer({
					email: userRow?.email ?? "",
					name: userRow?.name ?? "",
					userId: ctx.session.userId,
				});
				customerId = customer.id;

				// Upsert keyed on the now-unique user_id so concurrent calls and
				// webhook writes cannot create duplicate subscription rows.
				await ctx.db
					.insert(billingSchema.subscriptions)
					.values({
						id: nanoid(),
						userId: ctx.session.userId,
						stripeCustomerId: customerId,
					})
					.onConflictDoUpdate({
						target: billingSchema.subscriptions.userId,
						set: { stripeCustomerId: customerId, updatedAt: new Date() },
					});
			}

			const origin = ctx.env.APP_URL ?? "http://localhost:5173";
			const session = await billing.createCheckoutSession({
				customerId,
				priceId: input.priceId,
				mode: "subscription",
				successUrl: `${origin}/dashboard/billing?success=1`,
				cancelUrl: `${origin}/dashboard/billing?canceled=1`,
				metadata: { userId: ctx.session.userId },
			});

			return { url: session.url };
		}),

	getPortalUrl: protectedProcedure.mutation(async ({ ctx }) => {
		const billing = getBillingService(ctx.env.STRIPE_API_KEY);
		const sub = await ctx.db
			.select()
			.from(billingSchema.subscriptions)
			.where(eq(billingSchema.subscriptions.userId, ctx.session.userId))
			.get();

		if (!sub?.stripeCustomerId) {
			throw new Error("No billing account found");
		}

		const origin = ctx.env.APP_URL ?? "http://localhost:5173";
		const session = await billing.createPortalSession({
			customerId: sub.stripeCustomerId,
			returnUrl: `${origin}/dashboard/billing`,
		});

		return { url: session.url };
	}),

	cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
		const billing = getBillingService(ctx.env.STRIPE_API_KEY);
		const sub = await ctx.db
			.select()
			.from(billingSchema.subscriptions)
			.where(eq(billingSchema.subscriptions.userId, ctx.session.userId))
			.get();

		if (!sub?.stripeSubscriptionId) {
			throw new Error("No active subscription found");
		}

		await billing.cancelSubscription(sub.stripeSubscriptionId);
		await ctx.db
			.update(billingSchema.subscriptions)
			.set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
			.where(eq(billingSchema.subscriptions.userId, ctx.session.userId));

		return { success: true };
	}),
});
