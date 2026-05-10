import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as invoiceSchema from "../../db/schema/invoices";
import * as nfseSchema from "../../db/schema/nfse";
import { protectedProcedure, router } from "../../lib/trpc";
import { getFiscalNacionalService } from "../../services/nfse";

export const nfseRouter = router({
	// -------------------------------------------------------------------------
	// CF-126: Get NFSe status for an invoice
	// -------------------------------------------------------------------------
	getStatus: protectedProcedure
		.input(z.object({ invoiceId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Verify the invoice belongs to this user
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

	// -------------------------------------------------------------------------
	// CF-127: Re-emit NFSe manually (resets status to pending and re-triggers)
	// -------------------------------------------------------------------------
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

			if (!invoice) {
				throw new Error("Invoice not found");
			}

			// Create a new NFSe record (previous error record preserved for audit)
			const nfseRecordId = nanoid();
			await ctx.db.insert(nfseSchema.nfseRecords).values({
				id: nfseRecordId,
				invoiceId: invoice.id,
				userId: ctx.session.userId,
				status: "pending",
			});

			// Trigger the background task
			const { tasks } = await import("@trigger.dev/sdk");
			await tasks.trigger("nfse-generation", {
				invoiceId: invoice.id,
				nfseRecordId,
				internalApiKey: ctx.env.INTERNAL_API_KEY,
				internalApiUrl: ctx.env.APP_URL,
				fiscalNacionalApiKey: ctx.env.FISCAL_NACIONAL_API_KEY,
				fiscalNacionalEnvironment:
					(ctx.env.FISCAL_NACIONAL_ENVIRONMENT as "staging" | "production") ??
					"staging",
			});

			return { nfseRecordId, queued: true };
		}),

	// -------------------------------------------------------------------------
	// CF-128a: Get company settings
	// -------------------------------------------------------------------------
	getSettings: protectedProcedure.query(async ({ ctx }) => {
		const settings = await ctx.db
			.select()
			.from(nfseSchema.companySettings)
			.where(eq(nfseSchema.companySettings.userId, ctx.session.userId))
			.get();

		return settings ?? null;
	}),

	// -------------------------------------------------------------------------
	// CF-128b: Update company settings
	// -------------------------------------------------------------------------
	updateSettings: protectedProcedure
		.input(
			z.object({
				cnpj: z.string().optional(),
				razaoSocial: z.string().optional(),
				inscricaoMunicipal: z.string().optional(),
				nomeFantasia: z.string().optional(),
				street: z.string().optional(),
				number: z.string().optional(),
				complement: z.string().optional(),
				neighborhood: z.string().optional(),
				city: z.string().optional(),
				state: z.string().optional(),
				zipCode: z.string().optional(),
				cityCode: z.number().int().optional(),
				serviceDescription: z.string().optional(),
				cnaeCode: z.string().optional(),
				issRate: z.number().int().min(0).max(10000).optional(),
				municipalityCode: z.string().optional(),
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

	// -------------------------------------------------------------------------
	// Extra: cancel an issued NFSe
	// -------------------------------------------------------------------------
	cancel: protectedProcedure
		.input(z.object({ nfseRecordId: z.string() }))
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
			if (!record.fiscalNacionalId) throw new Error("NFSe not yet emitted");

			const environment =
				(ctx.env.FISCAL_NACIONAL_ENVIRONMENT as "staging" | "production") ??
				"staging";
			const service = getFiscalNacionalService(
				ctx.env.FISCAL_NACIONAL_API_KEY,
				environment,
			);

			const result = await service.cancelNfse(record.fiscalNacionalId);

			if (result.cancelled) {
				await ctx.db
					.update(nfseSchema.nfseRecords)
					.set({
						status: "cancelled",
						cancelledAt: result.cancelledAt
							? new Date(result.cancelledAt)
							: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(nfseSchema.nfseRecords.id, record.id));
			}

			return result;
		}),
});
