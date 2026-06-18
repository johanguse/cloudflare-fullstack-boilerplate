import { escapeHtml, wrapEmailBody } from "./html-utils";
import { getEmailT, resolveLocale } from "./i18n";

export interface NfseIssuedEmailData {
	appName: string;
	nfseNumber?: string;
	pdfUrl?: string;
	xmlUrl?: string;
	invoiceNumber: string;
	locale?: string;
}

export function renderNfseIssuedEmail(data: NfseIssuedEmailData): string {
	const t = getEmailT(data.locale);
	const lang = resolveLocale(data.locale);
	const num = data.nfseNumber
		? `<p style="margin:0 0 8px;"><strong>${t.nfseIssued.nfseNumber}</strong> ${escapeHtml(data.nfseNumber)}</p>`
		: "";
	const pdf = data.pdfUrl
		? `<p style="margin:12px 0 0;"><a href="${escapeHtml(data.pdfUrl)}" style="color:#4f46e5;">${t.nfseIssued.downloadPdf}</a></p>`
		: "";
	const xml = data.xmlUrl
		? `<p style="margin:8px 0 0;"><a href="${escapeHtml(data.xmlUrl)}" style="color:#4f46e5;">${t.nfseIssued.downloadXml}</a></p>`
		: "";
	const inner = `
<p style="margin:0 0 16px;">${t.nfseIssued.body(escapeHtml(data.invoiceNumber))}</p>
${num}
${pdf}
${xml}`;
	return wrapEmailBody(data.appName, t.nfseIssued.title, inner, undefined, lang);
}
