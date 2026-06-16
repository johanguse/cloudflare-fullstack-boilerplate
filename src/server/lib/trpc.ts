import { TRPCError, initTRPC } from "@trpc/server";
import { eq } from "drizzle-orm";
import * as authSchema from "../db/schema/auth";
import type { tRPCContext } from "./types";

export const t = initTRPC.context<tRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	const dbUser = await ctx.db
		.select({ role: authSchema.user.role })
		.from(authSchema.user)
		.where(eq(authSchema.user.id, ctx.session.userId))
		.get();

	if (dbUser?.role !== "admin") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Admin access required",
		});
	}
	return next({ ctx });
});
