import { escapeHtml, wrapEmailBody } from "./html-utils";

export interface LowBalanceEmailData {
	appName: string;
	balance: number;
	threshold: number;
	billingUrl: string;
}

export function renderLowBalanceAlertEmail(data: LowBalanceEmailData): string {
	const inner = `
<p style="margin:0 0 16px;">Your credit balance is low.</p>
<p style="margin:0 0 8px;"><strong>Current balance</strong> ${data.balance} credits</p>
<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">We notify when you cross ${data.threshold} credits.</p>
<p style="margin:0;"><a href="${escapeHtml(data.billingUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Add credits</a></p>`;
	return wrapEmailBody(data.appName, "Low credit balance", inner);
}
