import { escapeHtml, wrapEmailBody } from "./html-utils";

export interface NfseIssuedEmailData {
	appName: string;
	nfseNumber?: string;
	pdfUrl?: string;
	xmlUrl?: string;
	invoiceNumber: string;
}

export function renderNfseIssuedEmail(data: NfseIssuedEmailData): string {
	const num = data.nfseNumber
		? `<p style="margin:0 0 8px;"><strong>NFSe number</strong> ${escapeHtml(data.nfseNumber)}</p>`
		: "";
	const pdf = data.pdfUrl
		? `<p style="margin:12px 0 0;"><a href="${escapeHtml(data.pdfUrl)}" style="color:#4f46e5;">Download NFSe PDF</a></p>`
		: "";
	const xml = data.xmlUrl
		? `<p style="margin:8px 0 0;"><a href="${escapeHtml(data.xmlUrl)}" style="color:#4f46e5;">Download XML</a></p>`
		: "";
	const inner = `
<p style="margin:0 0 16px;">Your NFS-e was issued for invoice <strong>${escapeHtml(data.invoiceNumber)}</strong>.</p>
${num}
${pdf}
${xml}`;
	return wrapEmailBody(data.appName, "Your NFSe was issued", inner);
}
