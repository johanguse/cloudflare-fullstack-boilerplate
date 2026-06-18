import { eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "../../db/schema/auth";
import { SUPPORTED_LOCALES } from "../../emails/i18n";
import { protectedProcedure, router } from "../../lib/trpc";

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
		.input(z.object({ locale: z.enum(SUPPORTED_LOCALES as [string, ...string[]]) }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(schema.user)
				.set({ locale: input.locale, updatedAt: new Date() })
				.where(eq(schema.user.id, ctx.session.userId));
			return { success: true };
		}),

	deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
		await ctx.db
			.delete(schema.user)
			.where(eq(schema.user.id, ctx.session.userId));
		return { success: true };
	}),
});
