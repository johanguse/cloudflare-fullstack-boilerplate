import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { DBInstance } from "../db";
import * as invoiceSchema from "../db/schema/invoices";

// ---------------------------------------------------------------------------
// Invoice number generation: YYYY-NNNN (sequential per year)
// ---------------------------------------------------------------------------

export async function generateInvoiceNumber(db: DBInstance): Promise<string> {
	const year = new Date().getFullYear();
	const prefix = `${year}-`;

	const result = await db
		.select({ total: count() })
		.from(invoiceSchema.invoices)
		.where(
			and(
				gte(
					invoiceSchema.invoices.createdAt,
					new Date(`${year}-01-01T00:00:00.000Z`),
				),
				lte(
					invoiceSchema.invoices.createdAt,
					new Date(`${year}-12-31T23:59:59.999Z`),
				),
			),
		)
		.get();

	const seq = (result?.total ?? 0) + 1;
	return `${prefix}${String(seq).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Create invoice from a Stripe Invoice object
// ---------------------------------------------------------------------------

export interface StripeInvoiceInput {
	stripeInvoiceId: string;
	userId: string;
	amountSubtotal: number;
	amountTax: number;
	amountTotal: number;
	currency: string;
	customerName: string | null;
	customerEmail: string | null;
	description: string | null;
	lines: Array<{
		description: string;
		quantity: number;
		unitAmount: number;
		total: number;
	}>;
	paidAt?: Date;
}

export async function createInvoiceFromStripe(
	db: DBInstance,
	input: StripeInvoiceInput,
): Promise<invoiceSchema.Invoice> {
	const existing = await db
		.select()
		.from(invoiceSchema.invoices)
		.where(eq(invoiceSchema.invoices.stripeInvoiceId, input.stripeInvoiceId))
		.get();

	if (existing) return existing;

	const number = await generateInvoiceNumber(db);
	const now = new Date();
	const id = nanoid();

	await db.transaction(async (tx) => {
		await tx.insert(invoiceSchema.invoices).values({
			id,
			userId: input.userId,
			number,
			stripeInvoiceId: input.stripeInvoiceId,
			status: input.paidAt ? "paid" : "issued",
			currency: input.currency.toUpperCase(),
			amountSubtotal: input.amountSubtotal,
			amountTax: input.amountTax,
			amountTotal: input.amountTotal,
			description: input.description,
			customerName: input.customerName,
			customerEmail: input.customerEmail,
			issuedAt: now,
			paidAt: input.paidAt,
		});

		if (input.lines.length > 0) {
			await tx.insert(invoiceSchema.invoiceItems).values(
				input.lines.map((line) => ({
					id: nanoid(),
					invoiceId: id,
					description: line.description,
					quantity: line.quantity,
					unitAmount: line.unitAmount,
					total: line.total,
				})),
			);
		}
	});

	const created = await db
		.select()
		.from(invoiceSchema.invoices)
		.where(eq(invoiceSchema.invoices.id, id))
		.get();

	if (!created) throw new Error("Failed to create invoice");
	return created;
}

// ---------------------------------------------------------------------------
// Create invoice manually
// ---------------------------------------------------------------------------

export interface ManualInvoiceInput {
	userId: string;
	customerName: string;
	customerEmail: string;
	customerDocument?: string;
	description?: string;
	currency?: string;
	dueDate?: Date;
	items: Array<{
		description: string;
		quantity: number;
		unitAmount: number;
	}>;
}

export async function createManualInvoice(
	db: DBInstance,
	input: ManualInvoiceInput,
): Promise<invoiceSchema.Invoice> {
	const number = await generateInvoiceNumber(db);
	const id = nanoid();

	const subtotal = input.items.reduce(
		(acc, item) => acc + item.quantity * item.unitAmount,
		0,
	);

	await db.transaction(async (tx) => {
		await tx.insert(invoiceSchema.invoices).values({
			id,
			userId: input.userId,
			number,
			status: "draft",
			currency: (input.currency ?? "BRL").toUpperCase(),
			amountSubtotal: subtotal,
			amountTax: 0,
			amountTotal: subtotal,
			description: input.description,
			customerName: input.customerName,
			customerEmail: input.customerEmail,
			customerDocument: input.customerDocument,
			dueDate: input.dueDate,
		});

		await tx.insert(invoiceSchema.invoiceItems).values(
			input.items.map((item) => ({
				id: nanoid(),
				invoiceId: id,
				description: item.description,
				quantity: item.quantity,
				unitAmount: item.unitAmount,
				total: item.quantity * item.unitAmount,
			})),
		);
	});

	const created = await db
		.select()
		.from(invoiceSchema.invoices)
		.where(eq(invoiceSchema.invoices.id, id))
		.get();

	if (!created) throw new Error("Failed to create invoice");
	return created;
}

// ---------------------------------------------------------------------------
// PDF generation — lightweight HTML → readable plain text stored in R2
// Workers do not have puppeteer/wkhtmltopdf. We generate a well-structured
// HTML receipt that browsers can print-to-PDF, and store a text summary in R2.
// ---------------------------------------------------------------------------

export function generateInvoiceHtml(
	invoice: invoiceSchema.Invoice,
	items: invoiceSchema.InvoiceItem[],
): string {
	const fmt = (cents: number, currency: string) =>
		new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency,
		}).format(cents / 100);

	const currency = invoice.currency ?? "BRL";
	const rows = items
		.map(
			(item) => `
		<tr>
			<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${item.description}</td>
			<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
			<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(item.unitAmount, currency)}</td>
			<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(item.total, currency)}</td>
		</tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Invoice ${invoice.number}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; color: #111; margin: 0; padding: 32px; }
  h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 0; border-bottom: 2px solid #111; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; }
  th:not(:first-child) { text-align: right; }
  .totals { margin-top: 24px; text-align: right; }
  .totals tr td { padding: 4px 0; }
  .totals .grand-total td { font-weight: 700; font-size: 18px; border-top: 2px solid #111; padding-top: 8px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>Invoice</h1>
<div class="meta">
  <strong>#${invoice.number}</strong> &nbsp;·&nbsp;
  ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString("pt-BR") : "—"} &nbsp;·&nbsp;
  Status: <strong>${invoice.status.toUpperCase()}</strong>
</div>
${
	(invoice.customerName ?? invoice.customerEmail)
		? `<div style="margin-bottom:24px;">
  <div><strong>Bill to</strong></div>
  <div>${invoice.customerName ?? ""}</div>
  <div style="color:#6b7280;">${invoice.customerEmail ?? ""}</div>
  ${invoice.customerDocument ? `<div style="color:#6b7280;">${invoice.customerDocument}</div>` : ""}
</div>`
		: ""
}
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th style="text-align:center;">Qty</th>
      <th style="text-align:right;">Unit price</th>
      <th style="text-align:right;">Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<table class="totals">
  <tr><td>Subtotal</td><td style="width:160px;">${fmt(invoice.amountSubtotal, currency)}</td></tr>
  ${invoice.amountTax > 0 ? `<tr><td>Tax</td><td>${fmt(invoice.amountTax, currency)}</td></tr>` : ""}
  <tr class="grand-total"><td>Total</td><td>${fmt(invoice.amountTotal, currency)}</td></tr>
  ${invoice.paidAt ? `<tr><td colspan="2" style="color:#16a34a;font-size:13px;">Paid on ${new Date(invoice.paidAt).toLocaleDateString("pt-BR")}</td></tr>` : ""}
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// R2 storage helpers
// ---------------------------------------------------------------------------

export interface R2Env {
	STORAGE: R2Bucket;
}

export async function storeInvoicePdf(
	storage: R2Bucket,
	invoiceId: string,
	html: string,
): Promise<string> {
	const key = `invoices/${invoiceId}/invoice.html`;
	await storage.put(key, html, {
		httpMetadata: { contentType: "text/html; charset=utf-8" },
	});
	return key;
}

export async function getInvoiceSignedUrl(
	storage: R2Bucket,
	r2Key: string,
): Promise<string | null> {
	const obj = await storage.get(r2Key);
	if (!obj) return null;
	// R2 does not support presigned URLs from Workers bindings.
	// Return a worker-served URL instead (handled by the REST endpoint below).
	return r2Key;
}

// ---------------------------------------------------------------------------
// List helpers
// ---------------------------------------------------------------------------

export async function listInvoices(
	db: DBInstance,
	userId: string,
	opts: {
		limit: number;
		offset: number;
		status?: invoiceSchema.Invoice["status"];
	},
) {
	const conditions = [eq(invoiceSchema.invoices.userId, userId)];
	if (opts.status) {
		conditions.push(eq(invoiceSchema.invoices.status, opts.status));
	}

	return db
		.select()
		.from(invoiceSchema.invoices)
		.where(and(...conditions))
		.orderBy(desc(invoiceSchema.invoices.createdAt))
		.limit(opts.limit)
		.offset(opts.offset)
		.all();
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

export function invoicesToCsv(rows: invoiceSchema.Invoice[]): string {
	const header = "Number,Status,Customer,Amount,Currency,IssuedAt,PaidAt\n";
	const body = rows
		.map((r) =>
			[
				r.number,
				r.status,
				r.customerName ?? "",
				(r.amountTotal / 100).toFixed(2),
				r.currency,
				r.issuedAt ? new Date(r.issuedAt).toISOString() : "",
				r.paidAt ? new Date(r.paidAt).toISOString() : "",
			]
				.map((v) => `"${String(v).replace(/"/g, '""')}"`)
				.join(","),
		)
		.join("\n");
	return header + body;
}
