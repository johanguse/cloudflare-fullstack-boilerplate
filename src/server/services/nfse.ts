// ---------------------------------------------------------------------------
// Fiscal Nacional NFSe Service
//
// Fiscal Nacional provides a unified REST API for emitting NFSe (Nota Fiscal
// de Serviço Eletrônica) across Brazilian municipalities.
//
// Docs: https://fiscalnacional.com.br/docs
// Sandbox base URL: https://sandbox.fiscalnacional.com.br/api/v1
// Production base URL: https://app.fiscalnacional.com.br/api/v1
// ---------------------------------------------------------------------------

export type FiscalNacionalEnvironment = "staging" | "production";

const BASE_URLS: Record<FiscalNacionalEnvironment, string> = {
	staging: "https://sandbox.fiscalnacional.com.br/api/v1",
	production: "https://app.fiscalnacional.com.br/api/v1",
};

// ---------------------------------------------------------------------------
// Input / output types
// ---------------------------------------------------------------------------

export interface NfseEmitInput {
	// Provider (prestador de serviços)
	cnpj: string;
	inscricaoMunicipal: string;
	razaoSocial: string;
	cityCode: number;

	// Taker (tomador de serviços)
	takerName: string;
	takerDocument: string;
	takerEmail: string;

	// Service details
	serviceDescription: string;
	cnaeCode: string;

	// Financials (all in centavos)
	serviceAmount: number;
	issRate: number;
	deductions?: number;

	// External reference for idempotency
	externalReference?: string;
}

export interface NfseEmitResult {
	fiscalNacionalId: string;
	status: "pending" | "processing" | "issued" | "error" | "cancelled";
	nfseNumber?: string;
	nfseVerificationCode?: string;
	pdfUrl?: string;
	xmlUrl?: string;
	errorMessage?: string;
}

export interface NfseStatusResult {
	fiscalNacionalId: string;
	status: "pending" | "processing" | "issued" | "error" | "cancelled";
	nfseNumber?: string;
	nfseVerificationCode?: string;
	pdfUrl?: string;
	xmlUrl?: string;
	errorMessage?: string;
	issuedAt?: string;
}

export interface NfseCancelResult {
	fiscalNacionalId: string;
	cancelled: boolean;
	cancelledAt?: string;
	errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Fiscal Nacional API Client
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
				Authorization: `Bearer ${this.apiKey}`,
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

	// -------------------------------------------------------------------------
	// Emit NFSe
	// -------------------------------------------------------------------------

	async emitNfse(input: NfseEmitInput): Promise<NfseEmitResult> {
		type FnResponse = {
			id: string;
			status: string;
			nfse_number?: string;
			verification_code?: string;
			pdf_url?: string;
			xml_url?: string;
			error?: string;
		};

		const payload = {
			prestador: {
				cnpj: input.cnpj.replace(/\D/g, ""),
				inscricao_municipal: input.inscricaoMunicipal,
				razao_social: input.razaoSocial,
				codigo_municipio: input.cityCode,
			},
			tomador: {
				cpf_cnpj: input.takerDocument.replace(/\D/g, ""),
				razao_social: input.takerName,
				email: input.takerEmail,
			},
			servico: {
				descricao: input.serviceDescription,
				codigo_cnae: input.cnaeCode.replace(/\D/g, ""),
				valor_servicos: input.serviceAmount / 100,
				aliquota_iss: input.issRate / 10000,
				deducoes: (input.deductions ?? 0) / 100,
			},
			referencia_externa: input.externalReference,
		};

		const data = await this.request<FnResponse>("/notas", {
			method: "POST",
			body: JSON.stringify(payload),
		});

		return {
			fiscalNacionalId: data.id,
			status: this.mapStatus(data.status),
			nfseNumber: data.nfse_number,
			nfseVerificationCode: data.verification_code,
			pdfUrl: data.pdf_url,
			xmlUrl: data.xml_url,
			errorMessage: data.error,
		};
	}

	// -------------------------------------------------------------------------
	// Get NFSe status
	// -------------------------------------------------------------------------

	async getNfseStatus(fiscalNacionalId: string): Promise<NfseStatusResult> {
		type FnStatusResponse = {
			id: string;
			status: string;
			nfse_number?: string;
			verification_code?: string;
			pdf_url?: string;
			xml_url?: string;
			error?: string;
			emitido_em?: string;
		};

		const data = await this.request<FnStatusResponse>(
			`/notas/${fiscalNacionalId}`,
		);

		return {
			fiscalNacionalId: data.id,
			status: this.mapStatus(data.status) as NfseStatusResult["status"],
			nfseNumber: data.nfse_number,
			nfseVerificationCode: data.verification_code,
			pdfUrl: data.pdf_url,
			xmlUrl: data.xml_url,
			errorMessage: data.error,
			issuedAt: data.emitido_em,
		};
	}

	// -------------------------------------------------------------------------
	// Cancel NFSe
	// -------------------------------------------------------------------------

	async cancelNfse(fiscalNacionalId: string): Promise<NfseCancelResult> {
		type FnCancelResponse = {
			id: string;
			cancelled: boolean;
			cancelado_em?: string;
			error?: string;
		};

		const data = await this.request<FnCancelResponse>(
			`/notas/${fiscalNacionalId}/cancelar`,
			{ method: "POST" },
		);

		return {
			fiscalNacionalId: data.id,
			cancelled: data.cancelled,
			cancelledAt: data.cancelado_em,
			errorMessage: data.error,
		};
	}

	// -------------------------------------------------------------------------
	// Map Fiscal Nacional status strings to our enum
	// -------------------------------------------------------------------------

	private mapStatus(
		status: string,
	): "pending" | "processing" | "issued" | "error" | "cancelled" {
		const map: Record<
			string,
			"pending" | "processing" | "issued" | "error" | "cancelled"
		> = {
			pendente: "pending",
			processando: "processing",
			emitida: "issued",
			emitido: "issued",
			erro: "error",
			error: "error",
			cancelada: "cancelled",
			cancelado: "cancelled",
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
// R2 helpers for NFSe files
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
	await storage.put(key, content, {
		httpMetadata: { contentType },
	});
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
