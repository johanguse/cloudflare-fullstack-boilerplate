import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as invoiceSchema from "../../db/schema/invoices";
import * as nfseSchema from "../../db/schema/nfse";
import { protectedProcedure, router } from "../../lib/trpc";
import { getFiscalNacionalService } from "../../services/nfse";

export const nfseRouter = router({
	getStatus: protectedProcedure
		.input(z.object({ invoiceId: z.string() }))
		.query(async ({ ctx, input }) => {
			const invoice = await ctx.db
				.select({ id: invoiceSchema.invoices.id })
				.from(invoiceSchema.invoices)
				.where(
					and(
						eq(invoiceSchema.invoices.id, input.invoiceId),
						eq(invoiceSchema.invoices.userId, ctx.session.userId),
					),
				)
				.get();

			if (!invoice) return null;

			const record = await ctx.db
				.select()
				.from(nfseSchema.nfseRecords)
				.where(eq(nfseSchema.nfseRecords.invoiceId, input.invoiceId))
				.get();

			return record ?? null;
		}),

	reEmit: protectedProcedure
		.input(z.object({ invoiceId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invoice = await ctx.db
				.select()
				.from(invoiceSchema.invoices)
				.where(
					and(
						eq(invoiceSchema.invoices.id, input.invoiceId),
						eq(invoiceSchema.invoices.userId, ctx.session.userId),
					),
				)
				.get();

			if (!invoice) throw new Error("Invoice not found");

			const nfseRecordId = nanoid();
			await ctx.db.insert(nfseSchema.nfseRecords).values({
				id: nfseRecordId,
				invoiceId: invoice.id,
				userId: ctx.session.userId,
				status: "pending",
			});

			const { tasks } = await import("@trigger.dev/sdk");
			await tasks.trigger("nfse-generation", {
				invoiceId: invoice.id,
				nfseRecordId,
				internalApiKey: ctx.env.INTERNAL_API_KEY,
				internalApiUrl: ctx.env.APP_URL,
				fiscalNacionalApiKey: ctx.env.FISCAL_NACIONAL_API_KEY,
				fiscalNacionalEnvironment:
					(ctx.env.FISCAL_NACIONAL_ENVIRONMENT as "staging" | "production") ?? "staging",
			});

			return { nfseRecordId, queued: true };
		}),

	getSettings: protectedProcedure.query(async ({ ctx }) => {
		const settings = await ctx.db
			.select()
			.from(nfseSchema.companySettings)
			.where(eq(nfseSchema.companySettings.userId, ctx.session.userId))
			.get();

		return settings ?? null;
	}),

	updateSettings: protectedProcedure
		.input(
			z.object({
				serviceDescription: z.string().optional(),
				productName: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const existing = await ctx.db
				.select({ userId: nfseSchema.companySettings.userId })
				.from(nfseSchema.companySettings)
				.where(eq(nfseSchema.companySettings.userId, ctx.session.userId))
				.get();

			if (existing) {
				await ctx.db
					.update(nfseSchema.companySettings)
					.set({ ...input, updatedAt: new Date() })
					.where(eq(nfseSchema.companySettings.userId, ctx.session.userId));
			} else {
				await ctx.db.insert(nfseSchema.companySettings).values({
					userId: ctx.session.userId,
					...input,
				});
			}

			return { saved: true };
		}),

	cancel: protectedProcedure
		.input(
			z.object({
				nfseRecordId: z.string(),
				reason: z.string().min(10).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const record = await ctx.db
				.select()
				.from(nfseSchema.nfseRecords)
				.where(
					and(
						eq(nfseSchema.nfseRecords.id, input.nfseRecordId),
						eq(nfseSchema.nfseRecords.userId, ctx.session.userId),
					),
				)
				.get();

			if (!record) throw new Error("NFSe record not found");
			if (!record.fiscalNacionalReference) throw new Error("NFSe not yet emitted");

			const environment =
				(ctx.env.FISCAL_NACIONAL_ENVIRONMENT as "staging" | "production") ?? "staging";
			const service = getFiscalNacionalService(
				ctx.env.FISCAL_NACIONAL_API_KEY,
				environment,
			);

			const result = await service.cancelNfse(
				record.fiscalNacionalReference,
				input.reason,
			);

			if (result.cancelled) {
				await ctx.db
					.update(nfseSchema.nfseRecords)
					.set({
						status: "cancelled",
						cancelledAt: result.cancelledAt ? new Date(result.cancelledAt) : new Date(),
						updatedAt: new Date(),
					})
					.where(eq(nfseSchema.nfseRecords.id, record.id));
			}

			return result;
		}),
});
