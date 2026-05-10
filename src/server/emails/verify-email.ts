import { escapeHtml, wrapEmailBody } from "./html-utils";

export interface VerifyEmailData {
	appName: string;
	verifyUrl: string;
}

export function renderVerifyEmail(data: VerifyEmailData): string {
	const inner = `
<p style="margin:0 0 16px;">Confirm your email address to finish setting up your account.</p>
<p style="margin:0;"><a href="${escapeHtml(data.verifyUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">Verify email</a></p>
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">If you did not create an account, you can ignore this message.</p>`;
	return wrapEmailBody(data.appName, "Verify your email", inner);
}
