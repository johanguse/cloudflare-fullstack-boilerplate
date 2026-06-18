import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { eq } from "drizzle-orm";
import { initDb } from "../db";
import * as invoiceSchema from "../db/schema/invoices";
import * as nfseSchema from "../db/schema/nfse";
import { createAppConfig } from "../lib/config";
import type { AppEnv } from "../lib/types";
import { sendNfseIssuedEmail } from "../services/email";
import { getFiscalNacionalService, storeNfsePdf, storeNfseXml } from "../services/nfse";
import { getNotificationPrefs } from "../services/notification-prefs";
import { getUserLocale } from "../services/user-locale";

export type NfseWorkflowParams = {
	invoiceId: string;
	nfseRecordId: string;
};

export class NfseGenerationWorkflow extends WorkflowEntrypoint<AppEnv, NfseWorkflowParams> {
	async run(event: WorkflowEvent<NfseWorkflowParams>, step: WorkflowStep) {
		const { invoiceId, nfseRecordId } = event.payload;

		// Step 1: Fetch invoice + optional service description defaults
		const { invoice, serviceDescription, productName } = await step.do(
			"fetch invoice data",
			async () => {
				const db = initDb(this.env);

				const invoice = await db
					.select()
					.from(invoiceSchema.invoices)
					.where(eq(invoiceSchema.invoices.id, invoiceId))
					.get();

				if (!invoice) {
					throw new NonRetryableError(`Invoice ${invoiceId} not found`);
				}

				const settings = await db
					.select()
					.from(nfseSchema.companySettings)
					.where(eq(nfseSchema.companySettings.userId, invoice.userId))
					.get();

				return {
					invoice,
					serviceDescription: settings?.serviceDescription ?? null,
					productName: settings?.productName ?? null,
				};
			},
		);

		// Step 2: Mark as processing
		await step.do("update status processing", async () => {
			const db = initDb(this.env);
			await db
				.update(nfseSchema.nfseRecords)
				.set({ status: "processing", updatedAt: new Date() })
				.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));
		});

		// Step 3: Emit NFSe via Fiscal Nacional
		const emitResult = await step.do(
			"emit nfse",
			{
				retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
				timeout: "2 minutes",
			},
			async () => {
				const environment =
					(this.env.FISCAL_NACIONAL_ENVIRONMENT as "staging" | "production") ?? "staging";
				const service = getFiscalNacionalService(this.env.FISCAL_NACIONAL_API_KEY, environment);

				const result = await service.emitNfse({
					customerName: invoice.customerName ?? "Customer",
					customerEmail: invoice.customerEmail ?? undefined,
					customerDocument: invoice.customerDocument ?? undefined,
					serviceDescription: invoice.description ?? serviceDescription ?? undefined,
					productName: productName ?? undefined,
					amount: invoice.amountTotal / 100,
					currencyCode: invoice.foreignCurrencyCode ?? undefined,
					foreignCurrencyAmount:
						invoice.foreignCurrencyAmount != null
							? invoice.foreignCurrencyAmount / 100
							: undefined,
					customerCountry: invoice.customerCountryIso2 ?? undefined,
					customerCountryIso2: invoice.customerCountryIso2 ?? undefined,
					externalReference: `invoice-${invoice.id}`,
				});

				const db = initDb(this.env);
				await db
					.update(nfseSchema.nfseRecords)
					.set({
						fiscalNacionalId: result.fiscalNacionalId,
						fiscalNacionalReference: result.fiscalNacionalReference,
						status:
							result.status === "issued" || result.status === "invoice_only"
								? result.status
								: "processing",
						nfseNumber: result.nfseNumber,
						pdfUrl: result.pdfUrl,
						xmlUrl: result.xmlUrl,
						invoiceUrl: result.invoiceUrl,
						updatedAt: new Date(),
					})
					.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));

				return {
					fiscalNacionalReference: result.fiscalNacionalReference,
					status: result.status,
					nfseNumber: result.nfseNumber,
					pdfUrl: result.pdfUrl,
					xmlUrl: result.xmlUrl,
					invoiceUrl: result.invoiceUrl,
				};
			},
		);

		// Synchronous resolution (issued or invoice_only)
		if (emitResult.status === "issued" || emitResult.status === "invoice_only") {
			await step.do("store files and notify", async () => {
				await this.storeFilesAndNotify(nfseRecordId, invoiceId, {
					nfseNumber: emitResult.nfseNumber,
					pdfUrl: emitResult.pdfUrl,
					xmlUrl: emitResult.xmlUrl,
					reference: emitResult.fiscalNacionalReference,
				});
			});
			return { issued: true, reference: emitResult.fiscalNacionalReference };
		}

		// Step 4: Poll Fiscal Nacional for status (up to ~2.5 minutes)
		const reference = emitResult.fiscalNacionalReference;
		const maxAttempts = 10;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			await step.sleep(`wait before poll ${attempt}`, "15 seconds");

			const pollResult = await step.do(
				`poll status ${attempt}`,
				{ retries: { limit: 2, delay: "3 seconds" } },
				async () => {
					const environment =
						(this.env.FISCAL_NACIONAL_ENVIRONMENT as "staging" | "production") ?? "staging";
					const service = getFiscalNacionalService(
						this.env.FISCAL_NACIONAL_API_KEY,
						environment,
					);
					return service.getNfseStatus(reference);
				},
			);

			if (pollResult.status === "issued") {
				await step.do(`finalize issued ${attempt}`, async () => {
					const db = initDb(this.env);
					await db
						.update(nfseSchema.nfseRecords)
						.set({
							status: "issued",
							nfseNumber: pollResult.nfseNumber,
							pdfUrl: pollResult.pdfUrl,
							xmlUrl: pollResult.xmlUrl,
							invoiceUrl: pollResult.invoiceUrl,
							emittedAt: pollResult.issuedAt ? new Date(pollResult.issuedAt) : new Date(),
							updatedAt: new Date(),
						})
						.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));

					await this.storeFilesAndNotify(nfseRecordId, invoiceId, {
						nfseNumber: pollResult.nfseNumber,
						pdfUrl: pollResult.pdfUrl,
						xmlUrl: pollResult.xmlUrl,
						reference,
					});
				});
				return { issued: true, reference };
			}

			if (pollResult.status === "error" || pollResult.status === "cancelled") {
				const errorMsg = pollResult.errorMessage ?? "NFSe processing failed";
				await step.do(`finalize error ${attempt}`, async () => {
					const db = initDb(this.env);
					await db
						.update(nfseSchema.nfseRecords)
						.set({ status: "error", errorMessage: errorMsg, updatedAt: new Date() })
						.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));
				});
				throw new NonRetryableError(errorMsg);
			}
		}

		// Polling exhausted
		const timeoutMsg = "NFSe status polling timed out after 10 attempts";
		await step.do("finalize timeout", async () => {
			const db = initDb(this.env);
			await db
				.update(nfseSchema.nfseRecords)
				.set({ status: "error", errorMessage: timeoutMsg, updatedAt: new Date() })
				.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));
		});
		throw new NonRetryableError(timeoutMsg);
	}

	private async storeFilesAndNotify(
		nfseRecordId: string,
		invoiceId: string,
		data: {
			nfseNumber?: string;
			pdfUrl?: string;
			xmlUrl?: string;
			reference: string;
		},
	) {
		const db = initDb(this.env);

		if (data.pdfUrl) {
			try {
				const res = await fetch(data.pdfUrl);
				if (res.ok) {
					const r2Key = await storeNfsePdf(
						this.env.STORAGE,
						nfseRecordId,
						await res.arrayBuffer(),
					);
					await db
						.update(nfseSchema.nfseRecords)
						.set({ pdfR2Key: r2Key, updatedAt: new Date() })
						.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));
				}
			} catch {
				// Non-fatal — external URL still accessible
			}
		}

		if (data.xmlUrl) {
			try {
				const res = await fetch(data.xmlUrl);
				if (res.ok) {
					const r2Key = await storeNfseXml(
						this.env.STORAGE,
						nfseRecordId,
						await res.text(),
					);
					await db
						.update(nfseSchema.nfseRecords)
						.set({ xmlR2Key: r2Key, updatedAt: new Date() })
						.where(eq(nfseSchema.nfseRecords.id, nfseRecordId));
				}
			} catch {
				// Non-fatal
			}
		}

		try {
			const invoice = await db
				.select()
				.from(invoiceSchema.invoices)
				.where(eq(invoiceSchema.invoices.id, invoiceId))
				.get();

			if (!invoice?.customerEmail) return;

			const [prefs, locale] = await Promise.all([
				getNotificationPrefs(db, invoice.userId),
				getUserLocale(db, invoice.userId),
			]);
			if (!prefs.notifyNfseIssued) return;

			const config = createAppConfig(this.env);
			await sendNfseIssuedEmail(this.env, config, invoice.customerEmail, {
				invoiceNumber: invoice.number,
				nfseNumber: data.nfseNumber,
				pdfUrl: data.pdfUrl,
				xmlUrl: data.xmlUrl,
				locale,
			});
		} catch (e) {
			console.error("[email] nfse issued notify failed", e);
		}
	}
}
