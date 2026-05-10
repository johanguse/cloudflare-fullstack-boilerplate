import { nanoid } from "nanoid";

export function newApiKeyPlain(): string {
	return `cfbp_live_${nanoid(40)}`;
}

export function normalizeApiKeyForHash(apiKey: string): string {
	return apiKey.trim();
}

export async function hashApiKey(plain: string): Promise<string> {
	const normalized = normalizeApiKeyForHash(plain);
	const enc = new TextEncoder();
	const digest = await crypto.subtle.digest("SHA-256", enc.encode(normalized));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export async function verifyApiKey(
	plain: string,
	storedHexHash: string,
): Promise<boolean> {
	const h = await hashApiKey(plain);
	return timingSafeEqualHex(h, storedHexHash);
}

function timingSafeEqualHex(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let out = 0;
	for (let i = 0; i < a.length; i++) {
		out |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return out === 0;
}
