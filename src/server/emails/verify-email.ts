import { escapeHtml, wrapEmailBody } from "./html-utils";
import { getEmailT, resolveLocale } from "./i18n";

export interface VerifyEmailData {
	appName: string;
	verifyUrl: string;
	locale?: string;
}

export function renderVerifyEmail(data: VerifyEmailData): string {
	const t = getEmailT(data.locale);
	const lang = resolveLocale(data.locale);
	const inner = `
<p style="margin:0 0 16px;">${t.verifyEmail.body}</p>
<p style="margin:0;"><a href="${escapeHtml(data.verifyUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">${t.verifyEmail.cta}</a></p>`;
	return wrapEmailBody(
		data.appName,
		t.verifyEmail.title,
		inner,
		t.verifyEmail.footer,
		lang,
	);
}
