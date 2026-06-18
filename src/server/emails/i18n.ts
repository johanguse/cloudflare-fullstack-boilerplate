export type EmailLocale = "en" | "pt-BR" | "es";

export const SUPPORTED_LOCALES: EmailLocale[] = ["en", "pt-BR", "es"];

export function resolveLocale(raw?: string | null): EmailLocale {
	if (!raw) return "en";
	if ((SUPPORTED_LOCALES as string[]).includes(raw)) return raw as EmailLocale;
	// Try language-only match (e.g. "pt" → "pt-BR")
	const lang = raw.split(/[-_]/)[0].toLowerCase();
	if (lang === "pt") return "pt-BR";
	if (lang === "es") return "es";
	return "en";
}

function interp(s: string, vars: Record<string, string | number>): string {
	return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

// ---------------------------------------------------------------------------
// Translation tables
// ---------------------------------------------------------------------------

const translations = {
	en: {
		welcome: {
			subject: (appName: string) => `Welcome to ${appName}`,
			title: "Welcome aboard",
			greeting: (name: string) => `Hi ${name},`,
			body: "Thanks for signing up. Your account is ready — you can sign in any time.",
			cta: "Open dashboard",
		},
		verifyEmail: {
			subject: (appName: string) => `Verify your email — ${appName}`,
			title: "Verify your email",
			body: "Confirm your email address to finish setting up your account.",
			cta: "Verify email",
			footer: "If you did not create an account, you can ignore this message.",
		},
		resetPassword: {
			subject: (appName: string) => `Reset your password — ${appName}`,
			title: "Reset your password",
			body: "We received a request to reset your password.",
			cta: "Reset password",
			footer: "This link expires soon. If you did not ask for a reset, ignore this email.",
		},
		otp: {
			subject: (appName: string) => `Your sign-in code — ${appName}`,
			body: (kind: string, appName: string) => `Your ${kind} code for ${appName}:`,
			footer: "Expires in 10 minutes.",
		},
		paymentReceipt: {
			subject: (appName: string) => `Payment received — ${appName}`,
			title: "Payment received",
			body: "Your payment was successful. Thank you!",
			plan: "Plan",
			amount: "Amount",
			cta: "View billing",
		},
		invoice: {
			subject: (number: string, appName: string) => `Invoice ${number} — ${appName}`,
			title: (number: string) => `Invoice ${number}`,
			body: (number: string) => `Invoice <strong>${number}</strong> is available.`,
			total: "Total",
			cta: "View invoice",
			download: "Download invoice",
			nfseLink: "NFSe / tax document",
		},
		subscriptionChanged: {
			subject: (appName: string) => `Subscription update — ${appName}`,
			title: "Subscription update",
			cta: "Open billing",
			cancelAtPeriodEnd:
				"Your subscription is set to cancel at the end of the billing period.",
			statusChanged: (status: string) =>
				`Your subscription status is now "${status}".`,
			deleted: "Your subscription has ended and your plan is now Free.",
		},
		nfseIssued: {
			subject: (appName: string) => `NFSe issued — ${appName}`,
			title: "Your NFSe was issued",
			body: (number: string) =>
				`Your NFS-e was issued for invoice <strong>${number}</strong>.`,
			nfseNumber: "NFSe number",
			downloadPdf: "Download NFSe PDF",
			downloadXml: "Download XML",
		},
		lowBalance: {
			subject: (appName: string) => `Low credit balance — ${appName}`,
			title: "Low credit balance",
			body: "Your credit balance is low.",
			current: "Current balance",
			currentValue: (n: number) => `${n} credits`,
			threshold: (n: number) => `We notify when you cross ${n} credits.`,
			cta: "Add credits",
		},
	},

	"pt-BR": {
		welcome: {
			subject: (appName: string) => `Bem-vindo ao ${appName}`,
			title: "Bem-vindo!",
			greeting: (name: string) => `Olá, ${name}!`,
			body: "Obrigado por se cadastrar. Sua conta está pronta — você pode entrar a qualquer momento.",
			cta: "Abrir painel",
		},
		verifyEmail: {
			subject: (appName: string) => `Verifique seu e-mail — ${appName}`,
			title: "Verifique seu e-mail",
			body: "Confirme seu endereço de e-mail para terminar de configurar sua conta.",
			cta: "Verificar e-mail",
			footer: "Se você não criou uma conta, pode ignorar esta mensagem.",
		},
		resetPassword: {
			subject: (appName: string) => `Redefinir sua senha — ${appName}`,
			title: "Redefinir sua senha",
			body: "Recebemos uma solicitação para redefinir sua senha.",
			cta: "Redefinir senha",
			footer: "Este link expira em breve. Se você não solicitou a redefinição, ignore este e-mail.",
		},
		otp: {
			subject: (appName: string) => `Seu código de acesso — ${appName}`,
			body: (kind: string, appName: string) =>
				`Seu código ${kind} para ${appName}:`,
			footer: "Expira em 10 minutos.",
		},
		paymentReceipt: {
			subject: (appName: string) => `Pagamento recebido — ${appName}`,
			title: "Pagamento recebido",
			body: "Seu pagamento foi efetuado com sucesso. Obrigado!",
			plan: "Plano",
			amount: "Valor",
			cta: "Ver cobrança",
		},
		invoice: {
			subject: (number: string, appName: string) => `Fatura ${number} — ${appName}`,
			title: (number: string) => `Fatura ${number}`,
			body: (number: string) => `A fatura <strong>${number}</strong> está disponível.`,
			total: "Total",
			cta: "Ver fatura",
			download: "Baixar fatura",
			nfseLink: "NFSe / documento fiscal",
		},
		subscriptionChanged: {
			subject: (appName: string) => `Atualização de assinatura — ${appName}`,
			title: "Atualização de assinatura",
			cta: "Abrir cobrança",
			cancelAtPeriodEnd:
				"Sua assinatura está configurada para cancelar ao final do período de cobrança.",
			statusChanged: (status: string) =>
				`O status da sua assinatura agora é "${status}".`,
			deleted: "Sua assinatura foi encerrada e seu plano agora é Free.",
		},
		nfseIssued: {
			subject: (appName: string) => `NFSe emitida — ${appName}`,
			title: "Sua NFSe foi emitida",
			body: (number: string) =>
				`Sua NFS-e foi emitida para a fatura <strong>${number}</strong>.`,
			nfseNumber: "Número da NFSe",
			downloadPdf: "Baixar PDF da NFSe",
			downloadXml: "Baixar XML",
		},
		lowBalance: {
			subject: (appName: string) => `Saldo de créditos baixo — ${appName}`,
			title: "Saldo de créditos baixo",
			body: "Seu saldo de créditos está baixo.",
			current: "Saldo atual",
			currentValue: (n: number) => `${n} créditos`,
			threshold: (n: number) =>
				`Notificamos quando você fica abaixo de ${n} créditos.`,
			cta: "Adicionar créditos",
		},
	},

	es: {
		welcome: {
			subject: (appName: string) => `Bienvenido a ${appName}`,
			title: "¡Bienvenido!",
			greeting: (name: string) => `Hola, ${name},`,
			body: "Gracias por registrarte. Tu cuenta está lista — puedes iniciar sesión en cualquier momento.",
			cta: "Abrir panel",
		},
		verifyEmail: {
			subject: (appName: string) => `Verifica tu correo — ${appName}`,
			title: "Verifica tu correo",
			body: "Confirma tu dirección de correo electrónico para terminar de configurar tu cuenta.",
			cta: "Verificar correo",
			footer: "Si no creaste una cuenta, puedes ignorar este mensaje.",
		},
		resetPassword: {
			subject: (appName: string) => `Restablecer tu contraseña — ${appName}`,
			title: "Restablecer tu contraseña",
			body: "Recibimos una solicitud para restablecer tu contraseña.",
			cta: "Restablecer contraseña",
			footer: "Este enlace expira pronto. Si no solicitaste un restablecimiento, ignora este correo.",
		},
		otp: {
			subject: (appName: string) => `Tu código de acceso — ${appName}`,
			body: (kind: string, appName: string) =>
				`Tu código de ${kind} para ${appName}:`,
			footer: "Expira en 10 minutos.",
		},
		paymentReceipt: {
			subject: (appName: string) => `Pago recibido — ${appName}`,
			title: "Pago recibido",
			body: "Tu pago fue exitoso. ¡Gracias!",
			plan: "Plan",
			amount: "Monto",
			cta: "Ver facturación",
		},
		invoice: {
			subject: (number: string, appName: string) => `Factura ${number} — ${appName}`,
			title: (number: string) => `Factura ${number}`,
			body: (number: string) => `La factura <strong>${number}</strong> está disponible.`,
			total: "Total",
			cta: "Ver factura",
			download: "Descargar factura",
			nfseLink: "NFSe / documento fiscal",
		},
		subscriptionChanged: {
			subject: (appName: string) => `Actualización de suscripción — ${appName}`,
			title: "Actualización de suscripción",
			cta: "Abrir facturación",
			cancelAtPeriodEnd:
				"Tu suscripción está programada para cancelarse al final del período de facturación.",
			statusChanged: (status: string) =>
				`El estado de tu suscripción ahora es "${status}".`,
			deleted: "Tu suscripción ha finalizado y tu plan ahora es Free.",
		},
		nfseIssued: {
			subject: (appName: string) => `NFSe emitida — ${appName}`,
			title: "Tu NFSe fue emitida",
			body: (number: string) =>
				`Tu NFS-e fue emitida para la factura <strong>${number}</strong>.`,
			nfseNumber: "Número de NFSe",
			downloadPdf: "Descargar PDF de NFSe",
			downloadXml: "Descargar XML",
		},
		lowBalance: {
			subject: (appName: string) => `Saldo de créditos bajo — ${appName}`,
			title: "Saldo de créditos bajo",
			body: "Tu saldo de créditos es bajo.",
			current: "Saldo actual",
			currentValue: (n: number) => `${n} créditos`,
			threshold: (n: number) => `Te notificamos cuando cruces ${n} créditos.`,
			cta: "Agregar créditos",
		},
	},
} as const;

export type EmailTranslations = (typeof translations)["en"];

export function getEmailT(locale?: string | null): EmailTranslations {
	const resolved = resolveLocale(locale);
	return translations[resolved] as unknown as EmailTranslations;
}

// Re-export interp for use in templates
export { interp };
