import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const invoices = sqliteTable("invoices", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	number: text("number").notNull().unique(),
	stripeInvoiceId: text("stripe_invoice_id").unique(),
	status: text("status", {
		enum: ["draft", "issued", "paid", "cancelled", "overdue"],
	})
		.notNull()
		.default("draft"),
	currency: text("currency").notNull().default("BRL"),
	amountSubtotal: integer("amount_subtotal").notNull().default(0),
	amountTax: integer("amount_tax").notNull().default(0),
	amountTotal: integer("amount_total").notNull().default(0),
	description: text("description"),
	customerName: text("customer_name"),
	customerEmail: text("customer_email"),
	customerDocument: text("customer_document"),
	pdfUrl: text("pdf_url"),
	pdfR2Key: text("pdf_r2_key"),
	dueDate: integer("due_date", { mode: "timestamp" }),
	issuedAt: integer("issued_at", { mode: "timestamp" }),
	paidAt: integer("paid_at", { mode: "timestamp" }),
	cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export const invoiceItems = sqliteTable("invoice_items", {
	id: text("id").primaryKey(),
	invoiceId: text("invoice_id")
		.notNull()
		.references(() => invoices.id, { onDelete: "cascade" }),
	description: text("description").notNull(),
	quantity: integer("quantity").notNull().default(1),
	unitAmount: integer("unit_amount").notNull(),
	total: integer("total").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

export const invoiceStatusLabels: Record<Invoice["status"], string> = {
	draft: "Draft",
	issued: "Issued",
	paid: "Paid",
	cancelled: "Cancelled",
	overdue: "Overdue",
};
