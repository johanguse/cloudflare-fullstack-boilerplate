/** Mask an email for display: `ada@example.com` -> `a***@example.com`. */
export function maskEmail(email: string): string {
	const [local, domain] = email.split("@");
	if (!domain || !local) return "***";
	const head = local.slice(0, 1);
	return `${head}***@${domain}`;
}
