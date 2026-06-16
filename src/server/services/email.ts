import { renderInvoiceEmail } from "../emails/invoice";
import { renderLowBalanceAlertEmail } from "../emails/low-balance-alert";
import { renderNfseIssuedEmail } from "../emails/nfse-issued";
import { renderPaymentReceiptEmail } from "../emails/payment-receipt";
import { renderResetPasswordEmail } from "../emails/reset-password";
import { renderSubscriptionChangedEmail } from "../emails/subscription-changed";
import { renderVerifyEmail } from "../emails/verify-email";
import { renderWelcomeEmail } from "../emails/welcome";
import type { AppConfig } from "../lib/config";
import type { AppEnv } from "../lib/types";

export interface SendEmailParams {
	to: string;
	subject: string;
	html: string;
	text?: string;
}

export function canSendWithCloudflareEmail(env: AppEnv): boolean {
	return Boolean(env.EMAIL);
}

/**
 * Sends mail via the Cloudflare `send_email` binding.
 * In development or when the binding is missing, logs and returns without throwing.
 */
export async function sendEmail(
	env: AppEnv,
	config: AppConfig,
	params: SendEmailParams,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
	const { to, subject, html, text } = params;

	if (config.isDevelopment) {
		console.info(`[email][dev] to=${to} subject=${subject}`);
		return { ok: true, skipped: true };
	}

	if (!env.EMAIL) {
		console.warn(
			`[email] No EMAIL binding — skipped send to ${to} (${subject})`,
		);
		return { ok: false, skipped: true };
	}

	try {
		await env.EMAIL.send({
			from: config.fromEmail,
			to,
			subject,
			html,
			text: text ?? stripHtml(html),
		});
		return { ok: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.error(`[email] send failed: ${message}`);
		return { ok: false, error: message };
	}
}

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 4000);
}

// --- High-level transactional sends ---

export async function sendWelcomeEmail(
	env: AppEnv,
	config: AppConfig,
	to: string,
	name: string,
) {
	const html = renderWelcomeEmail({
		appName: config.appName,
		name: name.trim() || "there",
		loginUrl: `${config.frontendUrl}/login`,
	});
	return sendEmail(env, config, {
		to,
		subject: `Welcome to ${config.appName}`,
		html,
	});
}

export async function sendVerifyEmailLink(
	env: AppEnv,
	config: AppConfig,
	to: string,
	verifyUrl: string,
) {
	const html = renderVerifyEmail({
		appName: config.appName,
		verifyUrl,
	});
	return sendEmail(env, config, {
		to,
		subject: `Verify your email — ${config.appName}`,
		html,
	});
}

export async function sendPasswordResetEmail(
	env: AppEnv,
	config: AppConfig,
	to: string,
	resetUrl: string,
) {
	const html = renderResetPasswordEmail({
		appName: config.appName,
		resetUrl,
	});
	return sendEmail(env, config, {
		to,
		subject: `Reset your password — ${config.appName}`,
		html,
	});
}

export async function sendOtpEmail(
	env: AppEnv,
	config: AppConfig,
	to: string,
	otp: string,
	kind: string,
) {
	const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;"><p>Your ${kind} code for ${config.appName}:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${otp}</p><p style="color:#666;font-size:13px;">Expires in 10 minutes.</p></body></html>`;
	return sendEmail(env, config, {
		to,
		subject: `Your sign-in code — ${config.appName}`,
		html,
		text: `Your code: ${otp}`,
	});
}

export async function sendPaymentReceiptEmail(
	env: AppEnv,
	config: AppConfig,
	to: string,
	amountCents: number,
	currency: string,
	planName?: string,
) {
	const amountLabel = new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(amountCents / 100);
	const html = renderPaymentReceiptEmail({
		appName: config.appName,
		amountLabel,
		planName,
		dashboardUrl: `${config.frontendUrl}/dashboard/billing`,
	});
	return sendEmail(env, config, {
		to,
		subject: `Payment received — ${config.appName}`,
		html,
	});
}

export async function sendInvoiceNotificationEmail(
	env: AppEnv,
	config: AppConfig,
	to: string,
	args: {
		invoiceNumber: string;
		amountCents: number;
		currency: string;
		invoiceId: string;
		nfsePdfUrl?: string | null;
	},
) {
	const amountLabel = new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: args.currency.toUpperCase(),
	}).format(args.amountCents / 100);
	const base = config.frontendUrl.replace(/\/$/, "");
	const invoiceUrl = `${base}/dashboard/invoices/${args.invoiceId}`;

	const html = renderInvoiceEmail({
		appName: config.appName,
		invoiceNumber: args.invoiceNumber,
		amountLabel,
		invoiceUrl,
		nfseUrl: args.nfsePdfUrl ?? undefined,
	});
	return sendEmail(env, config, {
		to,
		subject: `Invoice ${args.invoiceNumber} — ${config.appName}`,
		html,
	});
}

export async function sendNfseIssuedEmail(
	env: AppEnv,
	config: AppConfig,
	to: string,
	args: {
		invoiceNumber: string;
		nfseNumber?: string | null;
		pdfUrl?: string | null;
		xmlUrl?: string | null;
	},
) {
	const html = renderNfseIssuedEmail({
		appName: config.appName,
		invoiceNumber: args.invoiceNumber,
		nfseNumber: args.nfseNumber ?? undefined,
		pdfUrl: args.pdfUrl ?? undefined,
		xmlUrl: args.xmlUrl ?? undefined,
	});
	return sendEmail(env, config, {
		to,
		subject: `NFSe issued — ${config.appName}`,
		html,
	});
}

export async function sendLowBalanceEmail(
	env: AppEnv,
	config: AppConfig,
	to: string,
	balance: number,
	threshold: number,
) {
	const html = renderLowBalanceAlertEmail({
		appName: config.appName,
		balance,
		threshold,
		billingUrl: `${config.frontendUrl}/dashboard/billing/upgrade`,
	});
	return sendEmail(env, config, {
		to,
		subject: `Low credit balance — ${config.appName}`,
		html,
	});
}

export async function sendSubscriptionChangedEmail(
	env: AppEnv,
	config: AppConfig,
	to: string,
	message: string,
) {
	const html = renderSubscriptionChangedEmail({
		appName: config.appName,
		message,
		dashboardUrl: `${config.frontendUrl}/dashboard/billing`,
	});
	return sendEmail(env, config, {
		to,
		subject: `Subscription update — ${config.appName}`,
		html,
	});
}
