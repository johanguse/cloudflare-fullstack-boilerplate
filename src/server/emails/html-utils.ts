export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function wrapEmailBody(
	appName: string,
	title: string,
	innerHtml: string,
	footerNote?: string,
	lang = "en",
): string {
	const footer = footerNote
		? `<p style="margin:24px 0 0;font-size:12px;color:#6b7280;">${footerNote}</p>`
		: "";
	return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px 28px;">
<tr><td>
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;letter-spacing:0.02em;">${escapeHtml(appName)}</p>
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.25;color:#111827;">${escapeHtml(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#374151;">
${innerHtml}
</div>
${footer}
<p style="margin:28px 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} ${escapeHtml(appName)}</p>
</td></tr></table>
</td></tr></table>
</body>
</html>`;
}
