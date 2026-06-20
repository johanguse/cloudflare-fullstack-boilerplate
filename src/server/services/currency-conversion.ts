import type Stripe from "stripe";

// ---------------------------------------------------------------------------
// BACEN currency codes — bcb.gov.br/estabilidadefinanceira/tabela_de_moedas
// BACEN codes differ from ISO 4217 numeric codes — do not derive from parseInt
// ---------------------------------------------------------------------------

export const BACEN_CURRENCY_CODES: Record<string, string> = {
	// Major
	usd: "220",
	eur: "978",
	gbp: "540",
	chf: "510",
	cad: "165",
	aud: "150",
	jpy: "470",
	// Asian
	cny: "795",
	krw: "425",
	inr: "356",
	sgd: "702",
	hkd: "344",
	// Latin American
	ars: "706",
	mxn: "741",
	clp: "715",
	cop: "718",
	pen: "604",
	// European (non-Euro)
	dkk: "208",
	nok: "578",
	sek: "752",
	// Other
	zar: "785",
	nzd: "554",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ForeignAmountResult {
	foreignCurrencyCode: string | null;
	/** Amount in the customer's currency, in cents */
	foreignCurrencyAmount: number | null;
	/** ISO 3166-1 alpha-2 country code from the customer's billing address */
	customerCountryIso2: string | null;
	source: "stripe" | "ptax";
}

// ---------------------------------------------------------------------------
// PTAX — Banco Central do Brasil official exchange rate
// ---------------------------------------------------------------------------

function formatDateForPtax(date: Date): string {
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${mm}-${dd}-${date.getFullYear()}`;
}

async function getPtaxSellRate(currency: string): Promise<number | null> {
	// Walk back up to 7 calendar days — weekends and holidays have no rate
	const now = new Date();
	for (let i = 0; i < 7; i++) {
		const date = new Date(now);
		date.setDate(date.getDate() - i);

		try {
			const url =
				"https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
				"CotacaoMoedaDia(moeda=@moeda,dataCotacao=@data)" +
				`?@moeda='${currency.toUpperCase()}'&@data='${formatDateForPtax(date)}'&$format=json`;

			const res = await fetch(url, { headers: { Accept: "application/json" } });
			if (!res.ok) continue;

			const data = (await res.json()) as {
				value?: Array<{ cotacaoVenda: number }>;
			};

			const rates = data.value;
			if (rates?.length) return rates[rates.length - 1].cotacaoVenda;
		} catch {
			// continue to previous day
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Primary resolver
// Tier 1 — Stripe charge: charge.amount IS the exact amount the customer paid
//           in their local currency (e.g. 5500 = $55.00 USD).
//           This is what Stripe's balance transaction records as originalAmount.
// Tier 2 — PTAX: official BCB sell rate, amountBrl / sellRate.
// No hardcoded fallback — if both fail we return null so callers can decide.
// ---------------------------------------------------------------------------

export async function resolveForeignCurrencyAmount(params: {
	presentmentCurrency: string;
	/** Invoice amount_paid in BRL cents */
	amountBrl: number;
	stripeInvoiceId: string;
	stripe: Stripe;
}): Promise<ForeignAmountResult> {
	const { presentmentCurrency, amountBrl, stripeInvoiceId, stripe } = params;
	const iso = presentmentCurrency.toLowerCase();
	const bacenCode = BACEN_CURRENCY_CODES[iso] ?? null;

	// Tier 1: Stripe charge — exact amount charged to the customer's card.
	// charge.amount  = foreign amount in smallest unit (e.g. 5500 = $55.00 USD)
	// charge.currency = customer's currency (e.g. "usd")
	// charge.billing_details.address.country = ISO2 country for the NFSe customer_country field
	let customerCountryIso2: string | null = null;
	try {
		const payments = await stripe.invoicePayments.list({
			invoice: stripeInvoiceId,
			limit: 1,
		});

		const piRef = payments.data[0]?.payment?.payment_intent;
		const piId = typeof piRef === "string" ? piRef : piRef?.id;

		if (piId) {
			const pi = await stripe.paymentIntents.retrieve(piId, {
				expand: ["latest_charge"],
			});

			const charge = pi.latest_charge as Stripe.Charge | null | undefined;

			if (charge && typeof charge !== "string") {
				customerCountryIso2 = charge.billing_details?.address?.country ?? null;

				if (charge.currency === iso && charge.amount > 0) {
					return {
						foreignCurrencyCode: bacenCode,
						foreignCurrencyAmount: charge.amount,
						customerCountryIso2,
						source: "stripe",
					};
				}
			}
		}
	} catch {
		// fall through to PTAX
	}

	// Tier 2: PTAX — official Banco Central sell rate
	try {
		const sellRate = await getPtaxSellRate(presentmentCurrency.toUpperCase());
		if (sellRate && sellRate > 0) {
			return {
				foreignCurrencyCode: bacenCode,
				foreignCurrencyAmount: Math.round(amountBrl / sellRate),
				customerCountryIso2,
				source: "ptax",
			};
		}
	} catch {
		// fall through
	}

	return {
		foreignCurrencyCode: bacenCode,
		foreignCurrencyAmount: null,
		customerCountryIso2,
		source: "ptax",
	};
}
