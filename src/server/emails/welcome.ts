import { escapeHtml, wrapEmailBody } from "./html-utils";
import { getEmailT, resolveLocale } from "./i18n";

export interface WelcomeEmailData {
	name: string;
	appName: string;
	loginUrl: string;
	locale?: string;
}

export function renderWelcomeEmail(data: WelcomeEmailData): string {
	const t = getEmailT(data.locale);
	const lang = resolveLocale(data.locale);
	const inner = `
<p style="margin:0 0 16px;">${escapeHtml(t.welcome.greeting(data.name))}</p>
<p style="margin:0 0 16px;">${t.welcome.body}</p>
<p style="margin:0;"><a href="${escapeHtml(data.loginUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">${t.welcome.cta}</a></p>`;
	return wrapEmailBody(data.appName, t.welcome.title, inner, undefined, lang);
}
