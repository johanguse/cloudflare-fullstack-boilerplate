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
		// 1. Fetch invoice + optional user service description defaults
		// ------------------------------------------------------------------

		logger.info("Fetching invoice data", { invoiceId });
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
				currency: string;
				customerName: string | null;
				customerEmail: string | null;
				customerDocument: string | null;
				description: string | null;
			};
			serviceDescription: string | null;
			productName: string | null;
		};

		const { invoice, serviceDescription, productName } =
			(await invoiceRes.json()) as InvoiceData;

		// ------------------------------------------------------------------
		// 2. Update status to processing
		// ------------------------------------------------------------------

		await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
			status: "processing",
		});
		metadata.set("status", "emitting");

		// ------------------------------------------------------------------
		// 3. Emit via internal API (which calls Fiscal Nacional External API)
		// ------------------------------------------------------------------

		logger.info("Emitting NFSe", { invoiceId });

		const emitRes = await fetch(`${internalApiUrl}/api/internal/nfse/emit`, {
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
				serviceDescription,
				productName,
			}),
		});

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
			fiscalNacionalReference: string;
			status: string;
		};

		const emitResult = (await emitRes.json()) as EmitResult;
		logger.info("NFSe emission initiated", {
			reference: emitResult.fiscalNacionalReference,
		});
		metadata.set("fiscalNacionalReference", emitResult.fiscalNacionalReference);

		// Synchronous result (invoice_only or already issued)
		if (emitResult.status === "issued" || emitResult.status === "invoice_only") {
			metadata.set("status", emitResult.status);
			return { issued: true, reference: emitResult.fiscalNacionalReference };
		}

		// ------------------------------------------------------------------
		// 4. Poll for status (up to ~5 minutes)
		// ------------------------------------------------------------------

		metadata.set("status", "polling");
		let pollAttempts = 0;
		const maxPollAttempts = 10;

		while (pollAttempts < maxPollAttempts) {
			await wait.for({ seconds: 15 });
			pollAttempts++;
			metadata.set("pollAttempts", pollAttempts);

			const statusRes = await fetch(
				`${internalApiUrl}/api/internal/nfse/status/${encodeURIComponent(emitResult.fiscalNacionalReference)}`,
				{ headers: { Authorization: `Bearer ${internalApiKey}` } },
			);

			if (!statusRes.ok) {
				logger.warn("Status check failed, retrying", { attempt: pollAttempts });
				continue;
			}

			type StatusResult = {
				status: "pending" | "processing" | "issued" | "error" | "cancelled" | "invoice_only";
				nfseNumber?: string;
				pdfUrl?: string;
				xmlUrl?: string;
				invoiceUrl?: string;
				errorMessage?: string;
				issuedAt?: string;
			};

			const statusResult = (await statusRes.json()) as StatusResult;
			logger.info("NFSe status", { status: statusResult.status, attempt: pollAttempts });

			if (statusResult.status === "issued") {
				await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
					status: "issued",
					nfseNumber: statusResult.nfseNumber,
					pdfUrl: statusResult.pdfUrl,
					xmlUrl: statusResult.xmlUrl,
					invoiceUrl: statusResult.invoiceUrl,
					issuedAt: statusResult.issuedAt,
				});

				if (statusResult.pdfUrl ?? statusResult.xmlUrl) {
					await storeNfseFiles(
						internalApiUrl,
						internalApiKey,
						nfseRecordId,
						emitResult.fiscalNacionalReference,
						statusResult.pdfUrl,
						statusResult.xmlUrl,
					);
				}

				metadata.set("status", "issued");
				logger.info("NFSe issued", { nfseNumber: statusResult.nfseNumber });
				return { issued: true, reference: emitResult.fiscalNacionalReference };
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

		const timeoutMsg = "NFSe status polling timed out after 10 attempts";
		await updateNfseStatus(internalApiUrl, internalApiKey, nfseRecordId, {
			status: "error",
			errorMessage: timeoutMsg,
		});
		throw new Error(timeoutMsg);
	},
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateNfseStatus(
	baseUrl: string,
	apiKey: string,
	nfseRecordId: string,
	data: {
		status: "pending" | "processing" | "issued" | "error" | "cancelled" | "invoice_only";
		nfseNumber?: string;
		pdfUrl?: string;
		xmlUrl?: string;
		invoiceUrl?: string;
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
	reference: string,
	pdfUrl?: string,
	xmlUrl?: string,
) {
	await fetch(`${baseUrl}/api/internal/nfse/store-files/${nfseRecordId}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ reference, pdfUrl, xmlUrl }),
	});
}
