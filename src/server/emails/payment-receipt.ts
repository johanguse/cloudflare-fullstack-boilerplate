import { escapeHtml, wrapEmailBody } from "./html-utils";

export interface PaymentReceiptEmailData {
	appName: string;
	amountLabel: string;
	planName?: string;
	dashboardUrl: string;
}

export function renderPaymentReceiptEmail(
	data: PaymentReceiptEmailData,
): string {
	const planLine = data.planName
		? `<p style="margin:0 0 8px;"><strong>Plan</strong> ${escapeHtml(data.planName)}</p>`
		: "";
	const inner = `
<p style="margin:0 0 16px;">Your payment was successful. Thank you!</p>
<p style="margin:0 0 8px;"><strong>Amount</strong> ${escapeHtml(data.amountLabel)}</p>
${planLine}
<p style="margin:16px 0 0;"><a href="${escapeHtml(data.dashboardUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">View billing</a></p>`;
	return wrapEmailBody(data.appName, "Payment received", inner);
}
