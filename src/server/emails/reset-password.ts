import { escapeHtml, wrapEmailBody } from "./html-utils";
import { getEmailT, resolveLocale } from "./i18n";

export interface ResetPasswordEmailData {
	appName: string;
	resetUrl: string;
	locale?: string;
}

export function renderResetPasswordEmail(data: ResetPasswordEmailData): string {
	const t = getEmailT(data.locale);
	const lang = resolveLocale(data.locale);
	const inner = `
<p style="margin:0 0 16px;">${t.resetPassword.body}</p>
<p style="margin:0;"><a href="${escapeHtml(data.resetUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">${t.resetPassword.cta}</a></p>`;
	return wrapEmailBody(data.appName, t.resetPassword.title, inner, t.resetPassword.footer, lang);
}
