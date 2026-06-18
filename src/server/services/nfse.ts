// ---------------------------------------------------------------------------
// Fiscal Nacional External API Client
//
// Company CNPJ, ISS rate, and service codes are configured once in the
// Fiscal Nacional project dashboard — not passed per request.
//
// Docs: docs/NFSE_SETUP.md
// Production: https://api.fiscal.guseapp.com
// Staging:    https://api-staging.fiscal.guseapp.com
// ---------------------------------------------------------------------------

export type FiscalNacionalEnvironment = "staging" | "production";

const BASE_URLS: Record<FiscalNacionalEnvironment, string> = {
	staging: "https://api-staging.fiscal.guseapp.com",
	production: "https://api.fiscal.guseapp.com",
};

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface NfseEmitInput {
	customerName: string;
	customerEmail?: string;
	customerCountry?: string;
	customerCountryIso2?: string;
	customerDocument?: string;
	customerNif?: string;
	customerAddress?: string;
	customerNumber?: string;
	customerNeighborhood?: string;
	customerPostalCode?: string;
	customerState?: string;
	customerCityName?: string;
	customerCityCode?: number;
	serviceDescription?: string;
	productName?: string;
	amount: number;
	currencyCode?: string;
	foreignCurrencyAmount?: number;
	externalReference?: string;
}

export type NfseStatus =
	| "pending"
	| "processing"
	| "issued"
	| "error"
	| "cancelled"
	| "invoice_only";

export interface NfseEmitResult {
	fiscalNacionalId: string;
	fiscalNacionalReference: string;
	status: NfseStatus;
	nfseNumber?: string;
	pdfUrl?: string;
	xmlUrl?: string;
	invoiceUrl?: string;
	errorMessage?: string;
}

export interface NfseStatusResult {
	fiscalNacionalId: string;
	fiscalNacionalReference: string;
	status: NfseStatus;
	nfseNumber?: string;
	pdfUrl?: string;
	xmlUrl?: string;
	invoiceUrl?: string;
	errorMessage?: string;
	issuedAt?: string;
	cancelledAt?: string;
}

export interface NfseCancelResult {
	fiscalNacionalId: string;
	fiscalNacionalReference: string;
	cancelled: boolean;
	cancelledAt?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class FiscalNacionalService {
	private readonly apiKey: string;
	private readonly baseUrl: string;

	constructor(
		apiKey: string,
		environment: FiscalNacionalEnvironment = "staging",
	) {
		this.apiKey = apiKey;
		this.baseUrl = BASE_URLS[environment];
	}

	private async request<T>(
		path: string,
		options: RequestInit = {},
	): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			...options,
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": this.apiKey,
				...options.headers,
			},
		});

		if (!response.ok) {
			let errorBody = "";
			try {
				errorBody = await response.text();
			} catch {
				// ignore
			}
			throw new Error(
				`Fiscal Nacional API error ${response.status}: ${errorBody}`,
			);
		}

		return response.json() as Promise<T>;
	}

	async emitNfse(input: NfseEmitInput): Promise<NfseEmitResult> {
		type FnResponse = {
			id: string;
			reference: string;
			status: string;
			nfse_number: string | null;
			pdf_url: string | null;
			xml_url: string | null;
			invoice_url: string | null;
			error_message: string | null;
		};

		const payload: Record<string, unknown> = {
			customer_name: input.customerName,
			amount: input.amount,
		};

		if (input.customerEmail) payload.customer_email = input.customerEmail;
		if (input.customerCountry) payload.customer_country = input.customerCountry;
		if (input.customerCountryIso2) payload.customer_country_iso2 = input.customerCountryIso2;
		if (input.customerDocument) payload.customer_document = input.customerDocument.replace(/\D/g, "");
		if (input.customerNif) payload.customer_nif = input.customerNif;
		if (input.customerAddress) payload.customer_address = input.customerAddress;
		if (input.customerNumber) payload.customer_number = input.customerNumber;
		if (input.customerNeighborhood) payload.customer_neighborhood = input.customerNeighborhood;
		if (input.customerPostalCode) payload.customer_postal_code = input.customerPostalCode;
		if (input.customerState) payload.customer_state = input.customerState;
		if (input.customerCityName) payload.customer_city_name = input.customerCityName;
		if (input.customerCityCode) payload.customer_city_code = input.customerCityCode;
		if (input.serviceDescription) payload.service_description = input.serviceDescription;
		if (input.productName) payload.product_name = input.productName;
		if (input.currencyCode) payload.currency_code = input.currencyCode;
		if (input.foreignCurrencyAmount != null) payload.foreign_currency_amount = input.foreignCurrencyAmount;
		if (input.externalReference) payload.external_reference = input.externalReference;

		const data = await this.request<FnResponse>("/api/v1/external/nfse", {
			method: "POST",
			body: JSON.stringify(payload),
		});

		return {
			fiscalNacionalId: data.id,
			fiscalNacionalReference: data.reference,
			status: this.mapStatus(data.status),
			nfseNumber: data.nfse_number ?? undefined,
			pdfUrl: data.pdf_url ?? undefined,
			xmlUrl: data.xml_url ?? undefined,
			invoiceUrl: data.invoice_url ?? undefined,
			errorMessage: data.error_message ?? undefined,
		};
	}

	async getNfseStatus(reference: string): Promise<NfseStatusResult> {
		type FnStatusResponse = {
			id: string;
			reference: string;
			status: string;
			nfse_number: string | null;
			pdf_url: string | null;
			xml_url: string | null;
			invoice_url: string | null;
			error_message: string | null;
			issued_at: string | null;
			cancelled_at: string | null;
		};

		const data = await this.request<FnStatusResponse>(
			`/api/v1/external/nfse/${reference}`,
		);

		return {
			fiscalNacionalId: data.id,
			fiscalNacionalReference: data.reference,
			status: this.mapStatus(data.status),
			nfseNumber: data.nfse_number ?? undefined,
			pdfUrl: data.pdf_url ?? undefined,
			xmlUrl: data.xml_url ?? undefined,
			invoiceUrl: data.invoice_url ?? undefined,
			errorMessage: data.error_message ?? undefined,
			issuedAt: data.issued_at ?? undefined,
			cancelledAt: data.cancelled_at ?? undefined,
		};
	}

	async cancelNfse(reference: string, reason: string): Promise<NfseCancelResult> {
		type FnCancelResponse = {
			id: string;
			reference: string;
			status: string;
			cancelled_at: string | null;
		};

		const data = await this.request<FnCancelResponse>(
			`/api/v1/external/nfse/${reference}/cancel`,
			{
				method: "POST",
				body: JSON.stringify({ reason }),
			},
		);

		return {
			fiscalNacionalId: data.id,
			fiscalNacionalReference: data.reference,
			cancelled: data.status === "cancelled",
			cancelledAt: data.cancelled_at ?? undefined,
		};
	}

	private mapStatus(status: string): NfseStatus {
		const map: Record<string, NfseStatus> = {
			pending: "pending",
			processing: "processing",
			authorized: "issued",
			cancelled: "cancelled",
			error: "error",
			invoice_only: "invoice_only",
		};
		return map[status.toLowerCase()] ?? "processing";
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getFiscalNacionalService(
	apiKey: string,
	environment: FiscalNacionalEnvironment = "staging",
): FiscalNacionalService {
	return new FiscalNacionalService(apiKey, environment);
}

// ---------------------------------------------------------------------------
// R2 helpers
// ---------------------------------------------------------------------------

export async function storeNfsePdf(
	storage: R2Bucket,
	nfseId: string,
	content: string | ArrayBuffer,
): Promise<string> {
	const key = `nfse/${nfseId}/nfse.pdf`;
	const contentType =
		content instanceof ArrayBuffer
			? "application/pdf"
			: "text/html; charset=utf-8";
	await storage.put(key, content, { httpMetadata: { contentType } });
	return key;
}

export async function storeNfseXml(
	storage: R2Bucket,
	nfseId: string,
	xml: string,
): Promise<string> {
	const key = `nfse/${nfseId}/nfse.xml`;
	await storage.put(key, xml, {
		httpMetadata: { contentType: "application/xml; charset=utf-8" },
	});
	return key;
}
