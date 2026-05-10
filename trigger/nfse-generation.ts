import { logger, metadata, task, wait } from "@trigger.dev/sdk";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Payload schema
// ---------------------------------------------------------------------------

const NfseGenerationPayload = z.object({
	invoiceId: z.string(),
	nfseRecordId: z.string(),
	internalApiKey: z.string(),
	internalApiUrl: z.string(),
	fiscalNacionalApiKey: z.string(),
	fiscalNacionalEnvironment: z.enum(["staging", "production"]).default("staging"),
});

type NfseGenerationPayload = z.infer<typeof NfseGenerationPayload>;

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const nfseGenerationTask = task({
	id: "nfse-generation",
	retry: {
		maxAttempts: 3,
		minTimeoutInMs: 5000,
		maxTimeoutInMs: 60_000,
		factor: 2,
		randomize: true,
	},
	maxDuration: 600,

	run: async (payload: NfseGenerationPayload) => {
		const { invoiceId, nfseRecordId, internalApiUrl, internalApiKey } = payload;

		metadata.set("invoiceId", invoiceId);
		metadata.set("nfseRecordId", nfseRecordId);
		metadata.set("status", "starting");

		// ------------------------------------------------------------------
		// 1. Fetch invoice + company settings via internal API
		// ------------------------------------------------------------------

		logger.info("Fetching invoice and company settings", { invoiceId });
		metadata.set("status", "fetching_data");

		const invoiceRes = await fetch(
			`${internalApiUrl}/api/internal/nfse/invoice-data/${invoiceId}`,
			{
				headers: {
					Authorization: `Bearer ${internalApiKey}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (!invoiceRes.ok) {
			const body = await invoiceRes.text();
			throw new Error(`Failed to fetch invoice data: ${invoiceRes.status} ${body}`);
		}

		type InvoiceData = {
			invoice: {
				id: string;
				number: string;
				amountTotal: number;
				amountTax: number;
				currency: string;
				customerName: string | null;
				customerEmail: string | null;
				customerDocument: string | null;
				description: string | null;
			};
			companySettings: {
				cnpj: string;
				razaoSocial: string;
				inscricaoMunicipal: string;
				serviceDescription: string;
				cnaeCode: string;
				cityCode: number;
				issRate: number;
			} | null;
		};

		const invoiceData = (await invoiceRes.json()) as InvoiceData;
		const { invoice, companySettings } = invoiceData;

		if (!companySettings?.cnpj) {
			await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
				status: "error",
				errorMessage: "Company settings not configured. Set CNPJ and fiscal data in Settings → Company.",
			});
			logger.warn("NFSe emission skipped: company settings missing");
			return { skipped: true, reason: "company_settings_missing" };
		}

		if (!invoice.customerDocument) {
			await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
				status: "error",
				errorMessage: "Customer document (CPF/CNPJ) required for NFSe emission.",
			});
			logger.warn("NFSe emission skipped: customer document missing");
			return { skipped: true, reason: "customer_document_missing" };
		}

		// ------------------------------------------------------------------
		// 2. Update status to processing
		// ------------------------------------------------------------------

		await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
			status: "processing",
		});
		metadata.set("status", "emitting");

		// ------------------------------------------------------------------
		// 3. Emit to Fiscal Nacional
		// ------------------------------------------------------------------

		logger.info("Emitting NFSe to Fiscal Nacional", {
			cnpj: companySettings.cnpj,
			invoiceId,
		});

		const emitRes = await fetch(
			`${internalApiUrl}/api/internal/nfse/emit`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${internalApiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					nfseRecordId,
					invoice: {
						id: invoice.id,
						amountTotal: invoice.amountTotal,
						customerName: invoice.customerName,
						customerEmail: invoice.customerEmail,
						customerDocument: invoice.customerDocument,
						description: invoice.description,
					},
					companySettings,
				}),
			},
		);

		if (!emitRes.ok) {
			const body = await emitRes.text();
			const msg = `NFSe emission failed: ${emitRes.status} ${body}`;
			await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
				status: "error",
				errorMessage: msg,
			});
			throw new Error(msg);
		}

		type EmitResult = {
			fiscalNacionalId: string;
			status: string;
		};

		const emitResult = (await emitRes.json()) as EmitResult;
		logger.info("NFSe emission initiated", { fiscalNacionalId: emitResult.fiscalNacionalId });
		metadata.set("fiscalNacionalId", emitResult.fiscalNacionalId);

		// ------------------------------------------------------------------
		// 4. Poll until issued or error (up to ~5 minutes)
		// ------------------------------------------------------------------

		metadata.set("status", "polling");
		let pollAttempts = 0;
		const maxPollAttempts = 10;

		while (pollAttempts < maxPollAttempts) {
			await wait.for({ seconds: 15 });
			pollAttempts++;
			metadata.set("pollAttempts", pollAttempts);

			const statusRes = await fetch(
				`${internalApiUrl}/api/internal/nfse/status/${emitResult.fiscalNacionalId}`,
				{
					headers: {
						Authorization: `Bearer ${internalApiKey}`,
					},
				},
			);

			if (!statusRes.ok) {
				logger.warn("Status check failed, retrying", { attempt: pollAttempts });
				continue;
			}

			type StatusResult = {
				status: "pending" | "processing" | "issued" | "error" | "cancelled";
				nfseNumber?: string;
				nfseVerificationCode?: string;
				pdfUrl?: string;
				xmlUrl?: string;
				errorMessage?: string;
				issuedAt?: string;
			};

			const statusResult = (await statusRes.json()) as StatusResult;
			logger.info("NFSe status", { status: statusResult.status, attempt: pollAttempts });

			if (statusResult.status === "issued") {
				// Update DB record with final state
				await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
					status: "issued",
					nfseNumber: statusResult.nfseNumber,
					nfseVerificationCode: statusResult.nfseVerificationCode,
					pdfUrl: statusResult.pdfUrl,
					xmlUrl: statusResult.xmlUrl,
					issuedAt: statusResult.issuedAt,
				});

				// Store PDF/XML in R2 if URLs are available
				if (statusResult.pdfUrl ?? statusResult.xmlUrl) {
					await storeNfseFiles(
						internalApiUrl,
						internalApiKey,
						nfseRecordId,
						emitResult.fiscalNacionalId,
						statusResult.pdfUrl,
						statusResult.xmlUrl,
					);
				}

				metadata.set("status", "issued");
				logger.info("NFSe issued successfully", {
					nfseNumber: statusResult.nfseNumber,
				});

				return {
					issued: true,
					fiscalNacionalId: emitResult.fiscalNacionalId,
					nfseNumber: statusResult.nfseNumber,
				};
			}

			if (statusResult.status === "error" || statusResult.status === "cancelled") {
				const errorMsg = statusResult.errorMessage ?? "NFSe processing failed";
				await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
					status: "error",
					errorMessage: errorMsg,
				});
				throw new Error(errorMsg);
			}
		}

		// Timed out polling — mark as error for manual retry
		const timeoutMsg = "NFSe status polling timed out after 10 attempts";
		await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
			status: "error",
			errorMessage: timeoutMsg,
		});
		throw new Error(timeoutMsg);
	},
});

// ---------------------------------------------------------------------------
// Helpers — thin wrappers around internal API calls
// ---------------------------------------------------------------------------

async function updateNfseStatus(
	baseUrl: string,
	apiKey: string,
	nfseRecordId: string,
	data: {
		status: "pending" | "processing" | "issued" | "error" | "cancelled";
		nfseNumber?: string;
		nfseVerificationCode?: string;
		pdfUrl?: string;
		xmlUrl?: string;
		errorMessage?: string;
		issuedAt?: string;
	},
) {
	await fetch(`${baseUrl}/api/internal/nfse/update/${nfseRecordId}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	});
}

async function storeNfseFiles(
	baseUrl: string,
	apiKey: string,
	nfseRecordId: string,
	fiscalNacionalId: string,
	pdfUrl?: string,
	xmlUrl?: string,
) {
	await fetch(`${baseUrl}/api/internal/nfse/store-files/${nfseRecordId}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ fiscalNacionalId, pdfUrl, xmlUrl }),
	});
}
