import { escapeHtml, wrapEmailBody } from "./html-utils";

export interface InvoiceEmailData {
	appName: string;
	invoiceNumber: string;
	amountLabel: string;
	invoiceUrl: string;
	downloadUrl?: string;
	nfseUrl?: string;
}

export function renderInvoiceEmail(data: InvoiceEmailData): string {
	const download = data.downloadUrl
		? `<p style="margin:12px 0 0;"><a href="${escapeHtml(data.downloadUrl)}" style="color:#4f46e5;">Download invoice</a></p>`
		: "";
	const nfse = data.nfseUrl
		? `<p style="margin:8px 0 0;"><a href="${escapeHtml(data.nfseUrl)}" style="color:#4f46e5;">NFSe / tax document</a></p>`
		: "";
	const inner = `
<p style="margin:0 0 16px;">Invoice <strong>${escapeHtml(data.invoiceNumber)}</strong> is available.</p>
<p style="margin:0;"><strong>Total</strong> ${escapeHtml(data.amountLabel)}</p>
<p style="margin:16px 0 0;"><a href="${escapeHtml(data.invoiceUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">View invoice</a></p>
${download}
${nfse}`;
	return wrapEmailBody(
		data.appName,
		`Invoice ${escapeHtml(data.invoiceNumber)}`,
		inner,
	);
}
