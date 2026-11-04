export const WEBHOOK_SECRET = "whsec_local_upgrade_fixture";
export const STRIPE_API_VERSION = "2026-09-30.endive";

export async function signStripePayload(
	payload: string,
	timestamp = Math.floor(Date.now() / 1000),
) {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(WEBHOOK_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(`${timestamp}.${payload}`),
	);
	const hex = Array.from(new Uint8Array(signature), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
	return `t=${timestamp},v1=${hex}`;
}
