import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	REFERRAL_SLUG_MAX_LENGTH,
	REFERRAL_SLUG_MIN_LENGTH,
} from "../../../shared/referral";
import { protectedProcedure, router } from "../../lib/trpc";
import {
	getReferralDashboard,
	listReferrals,
	setReferralSlug,
} from "../../services/referral";

export const referralRouter = router({
	getDashboard: protectedProcedure.query(async ({ ctx }) => {
		return getReferralDashboard(ctx.db, ctx.session.userId);
	}),

	updateSlug: protectedProcedure
		.input(
			z.object({
				slug: z
					.string()
					.min(REFERRAL_SLUG_MIN_LENGTH)
					.max(REFERRAL_SLUG_MAX_LENGTH),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			try {
				return await setReferralSlug(ctx.db, ctx.session.userId, input.slug);
			} catch (err) {
				const message = err instanceof Error ? err.message : "UNKNOWN";
				if (message === "SLUG_TAKEN") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "That referral link is already taken.",
					});
				}
				if (message === "INVALID_SLUG") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"Use 4–32 lowercase letters, numbers, or hyphens (no leading/trailing hyphen).",
					});
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Could not update your referral link.",
					cause: err,
				});
			}
		}),

	list: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
			}),
		)
		.query(async ({ ctx, input }) => {
			return listReferrals(ctx.db, ctx.session.userId, {
				limit: input.limit,
				offset: input.offset,
			});
		}),
});
