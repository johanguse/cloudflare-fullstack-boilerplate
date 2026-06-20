import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import * as authSchema from "../../db/schema/auth";
import * as billingSchema from "../../db/schema/billing";
import * as invoicesSchema from "../../db/schema/invoices";
import * as settingsSchema from "../../db/schema/settings";
import { adminProcedure, router } from "../../lib/trpc";

export const adminRouter = router({
	getStats: adminProcedure.query(async ({ ctx }) => {
		const [userCount, invoiceStats, paidUserCount] = await Promise.all([
			ctx.db.select({ count: count() }).from(authSchema.user).get(),
			ctx.db
				.select({
					total: count(),
					totalRevenue: sql<number>`sum(${invoicesSchema.invoices.amountTotal})`,
				})
				.from(invoicesSchema.invoices)
				.where(eq(invoicesSchema.invoices.status, "paid"))
				.get(),
			ctx.db
				.select({ count: count() })
				.from(billingSchema.subscriptions)
				.where(eq(billingSchema.subscriptions.status, "active"))
				.get(),
		]);

		return {
			totalUsers: userCount?.count ?? 0,
			totalInvoices: invoiceStats?.total ?? 0,
			totalRevenue: Number(invoiceStats?.totalRevenue ?? 0),
			paidUsers: paidUserCount?.count ?? 0,
		};
	}),

	listUsers: adminProcedure
		.input(z.object({ limit: z.number().max(100).default(50) }).optional())
		.query(async ({ ctx, input }) => {
			const users = await ctx.db
				.select({
					id: authSchema.user.id,
					name: authSchema.user.name,
					email: authSchema.user.email,
					emailVerified: authSchema.user.emailVerified,
					role: authSchema.user.role,
					createdAt: authSchema.user.createdAt,
				})
				.from(authSchema.user)
				.orderBy(desc(authSchema.user.createdAt))
				.limit(input?.limit ?? 50);

			if (users.length === 0) return [];

			const subs = await ctx.db
				.select({
					userId: billingSchema.subscriptions.userId,
					plan: billingSchema.subscriptions.plan,
					status: billingSchema.subscriptions.status,
					creditBalance: billingSchema.subscriptions.creditBalance,
				})
				.from(billingSchema.subscriptions)
				.where(
					inArray(
						billingSchema.subscriptions.userId,
						users.map((u) => u.id),
					),
				);

			const subMap = new Map(subs.map((s) => [s.userId, s]));

			return users.map((u) => ({
				...u,
				plan: subMap.get(u.id)?.plan ?? "free",
				subscriptionStatus: subMap.get(u.id)?.status ?? "inactive",
				creditBalance: subMap.get(u.id)?.creditBalance ?? 0,
			}));
		}),

	getActivity: adminProcedure.query(async ({ ctx }) => {
		const [recentSessions, recentInvoices, recentApiKeys] = await Promise.all([
			ctx.db
				.select({
					id: authSchema.session.id,
					userId: authSchema.session.userId,
					createdAt: authSchema.session.createdAt,
					ipAddress: authSchema.session.ipAddress,
				})
				.from(authSchema.session)
				.orderBy(desc(authSchema.session.createdAt))
				.limit(30),
			ctx.db
				.select({
					id: invoicesSchema.invoices.id,
					userId: invoicesSchema.invoices.userId,
					amountTotal: invoicesSchema.invoices.amountTotal,
					status: invoicesSchema.invoices.status,
					createdAt: invoicesSchema.invoices.createdAt,
				})
				.from(invoicesSchema.invoices)
				.orderBy(desc(invoicesSchema.invoices.createdAt))
				.limit(30),
			ctx.db
				.select({
					id: settingsSchema.apiKeys.id,
					userId: settingsSchema.apiKeys.userId,
					name: settingsSchema.apiKeys.name,
					keyPrefix: settingsSchema.apiKeys.keyPrefix,
					createdAt: settingsSchema.apiKeys.createdAt,
					lastUsedAt: settingsSchema.apiKeys.lastUsedAt,
				})
				.from(settingsSchema.apiKeys)
				.orderBy(desc(settingsSchema.apiKeys.createdAt))
				.limit(30),
		]);

		const allUserIds = [
			...new Set([
				...recentSessions.map((s) => s.userId),
				...(recentInvoices.map((i) => i.userId).filter(Boolean) as string[]),
				...recentApiKeys.map((k) => k.userId),
			]),
		];

		const users =
			allUserIds.length > 0
				? await ctx.db
						.select({
							id: authSchema.user.id,
							name: authSchema.user.name,
							email: authSchema.user.email,
						})
						.from(authSchema.user)
						.where(inArray(authSchema.user.id, allUserIds))
				: [];

		const userMap = new Map(users.map((u) => [u.id, u]));

		const signIns = recentSessions.map((s) => ({
			id: `session-${s.id}`,
			type: "sign_in" as const,
			eventType: "Sign in",
			action: "Session created",
			severity: "low" as const,
			sourceIp: s.ipAddress ?? "Unknown",
			destinationIp: "Dashboard",
			userId: s.userId,
			userName: userMap.get(s.userId)?.name ?? "Unknown",
			userEmail: userMap.get(s.userId)?.email ?? "",
			detail: s.ipAddress ? `from ${s.ipAddress}` : "new session",
			createdAt: s.createdAt,
		}));

		const payments = recentInvoices
			.filter((i) => i.status === "paid")
			.map((i) => ({
				id: `invoice-${i.id}`,
				type: "payment" as const,
				eventType: "Payment",
				action: "Invoice paid",
				severity: "medium" as const,
				sourceIp: "Stripe",
				destinationIp: "Billing webhook",
				userId: i.userId ?? "",
				userName: i.userId
					? (userMap.get(i.userId)?.name ?? "Unknown")
					: "Unknown",
				userEmail: i.userId ? (userMap.get(i.userId)?.email ?? "") : "",
				detail: `$${(i.amountTotal / 100).toFixed(2)}`,
				createdAt: i.createdAt,
			}));

		const apiKeys = recentApiKeys.map((k) => ({
			id: `api-key-${k.id}`,
			type: "api_key_created" as const,
			eventType: "API key",
			action: `Created ${k.name}`,
			severity: "medium" as const,
			sourceIp: "Dashboard",
			destinationIp: "API access",
			userId: k.userId,
			userName: userMap.get(k.userId)?.name ?? "Unknown",
			userEmail: userMap.get(k.userId)?.email ?? "",
			detail: `${k.keyPrefix}...`,
			createdAt: k.createdAt,
		}));

		return [...signIns, ...payments, ...apiKeys]
			.sort((a, b) => {
				const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
				const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
				return tb - ta;
			})
			.slice(0, 50);
	}),

	updateUserRole: adminProcedure
		.input(z.object({ userId: z.string(), role: z.enum(["user", "admin"]) }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(authSchema.user)
				.set({ role: input.role, updatedAt: new Date() })
				.where(eq(authSchema.user.id, input.userId));
			return { success: true };
		}),
});
