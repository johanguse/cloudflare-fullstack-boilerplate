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
	nfseNumber: text("nfse_number"),
	nfseVerificationCode: text("nfse_verification_code"),

	// Status: pending → processing → issued | error | cancelled
	status: text("status", {
		enum: ["pending", "processing", "issued", "error", "cancelled"],
	})
		.notNull()
		.default("pending"),

	// Stored files in R2
	pdfUrl: text("pdf_url"),
	pdfR2Key: text("pdf_r2_key"),
	xmlUrl: text("xml_url"),
	xmlR2Key: text("xml_r2_key"),

	// Provider snapshot (denormalised for audit trail)
	cnpj: text("cnpj"),
	razaoSocial: text("razao_social"),
	inscricaoMunicipal: text("inscricao_municipal"),
	serviceDescription: text("service_description"),
	cnaeCode: text("cnae_code"),
	cityCode: integer("city_code"),
	issAmount: integer("iss_amount"),
	netAmount: integer("net_amount"),

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
// Company Settings — per-user Brazilian fiscal configuration
// ---------------------------------------------------------------------------

export const companySettings = sqliteTable("company_settings", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),

	// Fiscal identity
	cnpj: text("cnpj"),
	razaoSocial: text("razao_social"),
	inscricaoMunicipal: text("inscricao_municipal"),
	nomeFantasia: text("nome_fantasia"),

	// Address
	street: text("street"),
	number: text("number"),
	complement: text("complement"),
	neighborhood: text("neighborhood"),
	city: text("city"),
	state: text("state"),
	zipCode: text("zip_code"),
	cityCode: integer("city_code"),

	// Service defaults
	serviceDescription: text("service_description"),
	cnaeCode: text("cnae_code"),
	issRate: integer("iss_rate"),

	// Fiscal Nacional credentials
	municipalityCode: text("municipality_code"),

	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export type NewCompanySettings = typeof companySettings.$inferInsert;

// Human-readable status labels
export const nfseStatusLabels: Record<NfseRecord["status"], string> = {
	pending: "Pending",
	processing: "Processing",
	issued: "Issued",
	error: "Error",
	cancelled: "Cancelled",
};
