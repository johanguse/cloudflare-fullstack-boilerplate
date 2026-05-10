import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as settingsSchema from "../../db/schema/settings";
import { protectedProcedure, router } from "../../lib/trpc";
import { hashApiKey, newApiKeyPlain } from "../../services/api-keys-crypto";

export const apiKeysRouter = router({
	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: settingsSchema.apiKeys.id,
				name: settingsSchema.apiKeys.name,
				keyPrefix: settingsSchema.apiKeys.keyPrefix,
				createdAt: settingsSchema.apiKeys.createdAt,
				lastUsedAt: settingsSchema.apiKeys.lastUsedAt,
			})
			.from(settingsSchema.apiKeys)
			.where(eq(settingsSchema.apiKeys.userId, ctx.session.userId))
			.orderBy(desc(settingsSchema.apiKeys.createdAt))
			.all();
	}),

	create: protectedProcedure
		.input(z.object({ name: z.string().min(1).max(120) }))
		.mutation(async ({ ctx, input }) => {
			const plain = newApiKeyPlain();
			const keyHash = await hashApiKey(plain);
			const id = nanoid();
			await ctx.db.insert(settingsSchema.apiKeys).values({
				id,
				userId: ctx.session.userId,
				name: input.name,
				keyPrefix: plain.slice(0, 16),
				keyHash,
			});
			return { id, apiKey: plain, name: input.name };
		}),

	revoke: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.delete(settingsSchema.apiKeys)
				.where(
					and(
						eq(settingsSchema.apiKeys.id, input.id),
						eq(settingsSchema.apiKeys.userId, ctx.session.userId),
					),
				);
			return { revoked: true };
		}),
});
