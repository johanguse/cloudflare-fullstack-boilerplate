import { escapeHtml, wrapEmailBody } from "./html-utils";

export interface SubscriptionChangedEmailData {
	appName: string;
	message: string;
	dashboardUrl: string;
}

export function renderSubscriptionChangedEmail(
	data: SubscriptionChangedEmailData,
): string {
	const inner = `
<p style="margin:0 0 16px;">${escapeHtml(data.message)}</p>
<p style="margin:0;"><a href="${escapeHtml(data.dashboardUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Open billing</a></p>`;
	return wrapEmailBody(data.appName, "Subscription update", inner);
}
