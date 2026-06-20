import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { invoices } from "./invoices";

// ---------------------------------------------------------------------------
// NFSe Records — one record per NFSe emission attempt
// ---------------------------------------------------------------------------

export const nfseRecords = sqliteTable("nfse_records", {
	id: text("id").primaryKey(),
	invoiceId: text("invoice_id")
		.notNull()
		.references(() => invoices.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),

	// Fiscal Nacional identifiers
	fiscalNacionalId: text("fiscal_nacional_id"),
	fiscalNacionalReference: text("fiscal_nacional_reference"),

	// NFSe data
	nfseNumber: text("nfse_number"),

	// Status: pending → processing → issued | error | cancelled | invoice_only
	status: text("status", {
		enum: [
			"pending",
			"processing",
			"issued",
			"error",
			"cancelled",
			"invoice_only",
		],
	})
		.notNull()
		.default("pending"),

	// File URLs (from Fiscal Nacional) and R2 mirrors
	pdfUrl: text("pdf_url"),
	pdfR2Key: text("pdf_r2_key"),
	xmlUrl: text("xml_url"),
	xmlR2Key: text("xml_r2_key"),
	invoiceUrl: text("invoice_url"),

	// Error info
	errorMessage: text("error_message"),
	attemptCount: integer("attempt_count").notNull().default(0),

	// Timestamps
	emittedAt: integer("emitted_at", { mode: "timestamp" }),
	cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type NfseRecord = typeof nfseRecords.$inferSelect;
export type NewNfseRecord = typeof nfseRecords.$inferInsert;

// ---------------------------------------------------------------------------
// Company Settings — optional per-user defaults for NFSe descriptions
// CNPJ, ISS rate, and service codes are configured in the Fiscal Nacional
// project dashboard, not stored here.
// ---------------------------------------------------------------------------

export const companySettings = sqliteTable("company_settings", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),

	// Optional defaults sent with each NFSe request
	serviceDescription: text("service_description"),
	productName: text("product_name"),

	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type NewCompanySettings = typeof companySettings.$inferInsert;

export const nfseStatusLabels: Record<NfseRecord["status"], string> = {
	pending: "Pending",
	processing: "Processing",
	issued: "Issued",
	error: "Error",
	cancelled: "Cancelled",
	invoice_only: "Invoice only",
};
