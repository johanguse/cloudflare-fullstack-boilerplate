import { TRPCError } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import * as invoiceSchema from "../../db/schema/invoices";
import { createAppConfig } from "../../lib/config";
import { protectedProcedure, router } from "../../lib/trpc";
import { sendInvoiceNotificationEmail } from "../../services/email";
import {
	createManualInvoice,
	generateInvoiceHtml,
	listInvoices,
	storeInvoicePdf,
} from "../../services/invoices";
import { getNotificationPrefs } from "../../services/notification-prefs";

const invoiceStatusEnum = z.enum([
	"draft",
	"issued",
	"paid",
	"cancelled",
	"overdue",
]);

export const invoicesRouter = router({
	// -------------------------------------------------------------------------
	// CF-102: paginated list with optional status filter
	// -------------------------------------------------------------------------
	list: protectedProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
				status: invoiceStatusEnum.optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const rows = await listInvoices(ctx.db, ctx.session.userId, {
				limit: input.limit,
				offset: input.offset,
				status: input.status,
			});

			const conditions = [
				eq(invoiceSchema.invoices.userId, ctx.session.userId),
			];
			if (input.status) {
				conditions.push(eq(invoiceSchema.invoices.status, input.status));
			}
			const totalResult = await ctx.db
				.select({ total: count() })
				.from(invoiceSchema.invoices)
				.where(and(...conditions))
				.get();

			return { rows, total: totalResult?.total ?? 0 };
		}),

	// -------------------------------------------------------------------------
	// CF-103: get single invoice with its items
	// -------------------------------------------------------------------------
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const invoice = await ctx.db
				.select()
				.from(invoiceSchema.invoices)
				.where(
					and(
						eq(invoiceSchema.invoices.id, input.id),
						eq(invoiceSchema.invoices.userId, ctx.session.userId),
					),
				)
				.get();

			if (!invoice) return null;

			const items = await ctx.db
				.select()
				.from(invoiceSchema.invoiceItems)
				.where(eq(invoiceSchema.invoiceItems.invoiceId, invoice.id))
				.orderBy(invoiceSchema.invoiceItems.createdAt)
				.all();

			return { ...invoice, items };
		}),

	// -------------------------------------------------------------------------
	// CF-104: downloadPdf — generate HTML, store in R2, return a serve URL
	// -------------------------------------------------------------------------
	downloadPdf: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invoice = await ctx.db
				.select()
				.from(invoiceSchema.invoices)
				.where(
					and(
						eq(invoiceSchema.invoices.id, input.id),
						eq(invoiceSchema.invoices.userId, ctx.session.userId),
					),
				)
				.get();

			if (!invoice) throw new Error("Invoice not found");

			const items = await ctx.db
				.select()
				.from(invoiceSchema.invoiceItems)
				.where(eq(invoiceSchema.invoiceItems.invoiceId, invoice.id))
				.all();

			const html = generateInvoiceHtml(invoice, items);
			const r2Key = await storeInvoicePdf(ctx.env.STORAGE, invoice.id, html);

			// Persist the R2 key if not set yet
			if (!invoice.pdfR2Key) {
				await ctx.db
					.update(invoiceSchema.invoices)
					.set({ pdfR2Key: r2Key, updatedAt: new Date() })
					.where(eq(invoiceSchema.invoices.id, invoice.id));
			}

			return { downloadUrl: `/api/invoices/${invoice.id}/download` };
		}),

	// -------------------------------------------------------------------------
	// CF-105: resendEmail — placeholder (wired up fully in Phase 6 email system)
	// -------------------------------------------------------------------------
	resendEmail: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const invoice = await ctx.db
				.select()
				.from(invoiceSchema.invoices)
				.where(
					and(
						eq(invoiceSchema.invoices.id, input.id),
						eq(invoiceSchema.invoices.userId, ctx.session.userId),
					),
				)
				.get();

			if (!invoice) throw new Error("Invoice not found");
			if (!invoice.customerEmail)
				throw new Error("Invoice has no customer email");

			const prefs = await getNotificationPrefs(ctx.db, ctx.session.userId);
			if (!prefs.notifyInvoice) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Invoice emails are disabled in Settings → Notifications.",
				});
			}

			const config = createAppConfig(ctx.env);
			await sendInvoiceNotificationEmail(
				ctx.env,
				config,
				invoice.customerEmail,
				{
					invoiceNumber: invoice.number,
					amountCents: invoice.amountTotal,
					currency: invoice.currency,
					invoiceId: invoice.id,
				},
			);

			return { queued: true };
		}),

	// -------------------------------------------------------------------------
	// CF-106: manual invoice creation
	// -------------------------------------------------------------------------
	create: protectedProcedure
		.input(
			z.object({
				customerName: z.string().min(1),
				customerEmail: z.string().email(),
				customerDocument: z.string().optional(),
				description: z.string().optional(),
				currency: z.string().length(3).default("BRL"),
				dueDate: z.string().optional(),
				items: z
					.array(
						z.object({
							description: z.string().min(1),
							quantity: z.number().int().positive(),
							unitAmount: z.number().int().positive(),
						}),
					)
					.min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const invoice = await createManualInvoice(ctx.db, {
				userId: ctx.session.userId,
				customerName: input.customerName,
				customerEmail: input.customerEmail,
				customerDocument: input.customerDocument,
				description: input.description,
				currency: input.currency,
				dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
				items: input.items,
			});
			return invoice;
		}),

	// -------------------------------------------------------------------------
	// Issue a draft invoice
	// -------------------------------------------------------------------------
	issue: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(invoiceSchema.invoices)
				.set({ status: "issued", issuedAt: new Date(), updatedAt: new Date() })
				.where(
					and(
						eq(invoiceSchema.invoices.id, input.id),
						eq(invoiceSchema.invoices.userId, ctx.session.userId),
						eq(invoiceSchema.invoices.status, "draft"),
					),
				);
			return { success: true };
		}),

	// -------------------------------------------------------------------------
	// Cancel an invoice
	// -------------------------------------------------------------------------
	cancel: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(invoiceSchema.invoices)
				.set({
					status: "cancelled",
					cancelledAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(invoiceSchema.invoices.id, input.id),
						eq(invoiceSchema.invoices.userId, ctx.session.userId),
					),
				);
			return { success: true };
		}),
});
