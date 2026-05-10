import { escapeHtml, wrapEmailBody } from "./html-utils";

export interface WelcomeEmailData {
	name: string;
	appName: string;
	loginUrl: string;
}

export function renderWelcomeEmail(data: WelcomeEmailData): string {
	const inner = `
<p style="margin:0 0 16px;">Hi ${escapeHtml(data.name)},</p>
<p style="margin:0 0 16px;">Thanks for signing up. Your account is ready — you can sign in any time.</p>
<p style="margin:0;"><a href="${escapeHtml(data.loginUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Open dashboard</a></p>`;
	return wrapEmailBody(data.appName, "Welcome aboard", inner);
}
