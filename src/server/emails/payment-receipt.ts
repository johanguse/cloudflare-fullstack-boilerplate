import { escapeHtml, wrapEmailBody } from "./html-utils";
import { getEmailT, resolveLocale } from "./i18n";

export interface PaymentReceiptEmailData {
	appName: string;
	amountLabel: string;
	planName?: string;
	dashboardUrl: string;
	locale?: string;
}

export function renderPaymentReceiptEmail(data: PaymentReceiptEmailData): string {
	const t = getEmailT(data.locale);
	const lang = resolveLocale(data.locale);
	const planLine = data.planName
		? `<p style="margin:0 0 8px;"><strong>${t.paymentReceipt.plan}</strong> ${escapeHtml(data.planName)}</p>`
		: "";
	const inner = `
<p style="margin:0 0 16px;">${t.paymentReceipt.body}</p>
<p style="margin:0 0 8px;"><strong>${t.paymentReceipt.amount}</strong> ${escapeHtml(data.amountLabel)}</p>
${planLine}
<p style="margin:16px 0 0;"><a href="${escapeHtml(data.dashboardUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">${t.paymentReceipt.cta}</a></p>`;
	return wrapEmailBody(data.appName, t.paymentReceipt.title, inner, undefined, lang);
}
