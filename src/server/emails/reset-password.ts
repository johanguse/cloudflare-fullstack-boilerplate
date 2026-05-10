import { escapeHtml, wrapEmailBody } from "./html-utils";

export interface ResetPasswordEmailData {
	appName: string;
	resetUrl: string;
}

export function renderResetPasswordEmail(data: ResetPasswordEmailData): string {
	const inner = `
<p style="margin:0 0 16px;">We received a request to reset your password.</p>
<p style="margin:0;"><a href="${escapeHtml(data.resetUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Reset password</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">This link expires soon. If you did not ask for a reset, ignore this email.</p>`;
	return wrapEmailBody(data.appName, "Reset your password", inner);
}
