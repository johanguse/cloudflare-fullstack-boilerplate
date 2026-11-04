export const STAGING_SEED_EMAILS = [
	"admin@example.com",
	"user@example.com",
	"pro@example.com",
	"business@example.com",
	"agency@example.com",
] as const;

export function parseStagingSeedPasswords(
	raw: string | undefined,
): Record<string, string> {
	let input: unknown;
	try {
		input = JSON.parse(raw ?? "");
	} catch {
		throw new Error(
			"STAGING_SEED_PASSWORDS must be a JSON object keyed by seed email",
		);
	}
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		throw new Error(
			"STAGING_SEED_PASSWORDS must be a JSON object keyed by seed email",
		);
	}
	const passwords: Record<string, string> = {};
	for (const email of STAGING_SEED_EMAILS) {
		const password = (input as Record<string, unknown>)[email];
		if (
			typeof password !== "string" ||
			password.trim().length < 20 ||
			password.length > 128
		) {
			throw new Error(
				`Supply a private 20–128 character password for ${email}`,
			);
		}
		passwords[email] = password;
	}
	if (new Set(Object.values(passwords)).size !== STAGING_SEED_EMAILS.length) {
		throw new Error("Each staging seed account must have a different password");
	}
	return passwords;
}
