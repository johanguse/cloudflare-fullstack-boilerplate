import { escapeHtml, wrapEmailBody } from "./html-utils";
import { getEmailT, resolveLocale } from "./i18n";

export interface InvoiceEmailData {
	appName: string;
	invoiceNumber: string;
	amountLabel: string;
	invoiceUrl: string;
	downloadUrl?: string;
	nfseUrl?: string;
	locale?: string;
}

export function renderInvoiceEmail(data: InvoiceEmailData): string {
	const t = getEmailT(data.locale);
	const lang = resolveLocale(data.locale);
	const download = data.downloadUrl
		? `<p style="margin:12px 0 0;"><a href="${escapeHtml(data.downloadUrl)}" style="color:#4f46e5;">${t.invoice.download}</a></p>`
		: "";
	const nfse = data.nfseUrl
		? `<p style="margin:8px 0 0;"><a href="${escapeHtml(data.nfseUrl)}" style="color:#4f46e5;">${t.invoice.nfseLink}</a></p>`
		: "";
	const inner = `
<p style="margin:0 0 16px;">${t.invoice.body(escapeHtml(data.invoiceNumber))}</p>
<p style="margin:0;"><strong>${t.invoice.total}</strong> ${escapeHtml(data.amountLabel)}</p>
<p style="margin:16px 0 0;"><a href="${escapeHtml(data.invoiceUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">${t.invoice.cta}</a></p>
${download}
${nfse}`;
	return wrapEmailBody(data.appName, t.invoice.title(escapeHtml(data.invoiceNumber)), inner, undefined, lang);
}
