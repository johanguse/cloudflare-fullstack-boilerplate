import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";
import * as invoiceSchema from "../../db/schema/invoices";
import type { AppBindings } from "../../lib/types";
import {
	generateInvoiceHtml,
	invoicesToCsv,
	listInvoices,
} from "../../services/invoices";

export function registerInvoiceRoutes(app: Hono<AppBindings>) {
	// -----------------------------------------------------------------------
	// GET /api/invoices/export — download all invoices as CSV
	// -----------------------------------------------------------------------
	app.get("/api/invoices/export", async (c) => {
		const db = c.get("db");
		const session = c.get("session" as never) as
			| { userId: string }
			| null
			| undefined;
		if (!session?.userId) {
			return c.text("Unauthorized", 401);
		}

		const rows = await listInvoices(db, session.userId, {
			limit: 1000,
			offset: 0,
		});
		const csv = invoicesToCsv(rows);

		return new Response(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": 'attachment; filename="invoices.csv"',
			},
		});
	});

	// -----------------------------------------------------------------------
	// GET /api/invoices/:id/download — serve invoice HTML (print-to-PDF)
	// -----------------------------------------------------------------------
	app.get("/api/invoices/:id/download", async (c) => {
		const db = c.get("db");
		const session = c.get("session" as never) as
			| { userId: string }
			| null
			| undefined;
		if (!session?.userId) {
			return c.text("Unauthorized", 401);
		}

		const invoiceId = c.req.param("id");

		const invoice = await db
			.select()
			.from(invoiceSchema.invoices)
			.where(
				and(
					eq(invoiceSchema.invoices.id, invoiceId),
					eq(invoiceSchema.invoices.userId, session.userId),
				),
			)
			.get();

		if (!invoice) return c.text("Not found", 404);

		// Try R2 first
		if (invoice.pdfR2Key) {
			const obj = await c.env.STORAGE.get(invoice.pdfR2Key);
			if (obj) {
				return new Response(obj.body, {
					headers: {
						"Content-Type": "text/html; charset=utf-8",
						"Content-Disposition": `attachment; filename="invoice-${invoice.number}.html"`,
					},
				});
			}
		}

		// Regenerate on-the-fly
		const items = await db
			.select()
			.from(invoiceSchema.invoiceItems)
			.where(eq(invoiceSchema.invoiceItems.invoiceId, invoice.id))
			.all();

		const html = generateInvoiceHtml(invoice, items);

		return new Response(html, {
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				"Content-Disposition": `attachment; filename="invoice-${invoice.number}.html"`,
			},
		});
	});
}
