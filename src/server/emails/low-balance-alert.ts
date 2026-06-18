import { escapeHtml, wrapEmailBody } from "./html-utils";
import { getEmailT, resolveLocale } from "./i18n";

export interface LowBalanceEmailData {
	appName: string;
	balance: number;
	threshold: number;
	billingUrl: string;
	locale?: string;
}

export function renderLowBalanceAlertEmail(data: LowBalanceEmailData): string {
	const t = getEmailT(data.locale);
	const lang = resolveLocale(data.locale);
	const inner = `
<p style="margin:0 0 16px;">${t.lowBalance.body}</p>
<p style="margin:0 0 8px;"><strong>${t.lowBalance.current}</strong> ${t.lowBalance.currentValue(data.balance)}</p>
<p style="margin:0 0 16px;font-size:13px;color:#6b7280;">${t.lowBalance.threshold(data.threshold)}</p>
<p style="margin:0;"><a href="${escapeHtml(data.billingUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">${t.lowBalance.cta}</a></p>`;
	return wrapEmailBody(data.appName, t.lowBalance.title, inner, undefined, lang);
}
