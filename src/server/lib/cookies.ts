// Read a single cookie out of a raw request. Better Auth hands hooks either a
// `Headers` object or a plain header record depending on the endpoint, so we
// handle both shapes defensively.
export function readCookie(headers: unknown, name: string): string | null {
	let cookieHeader: string | null = null;
	if (headers instanceof Headers) {
		cookieHeader = headers.get("cookie");
	} else if (headers && typeof headers === "object" && "cookie" in headers) {
		const raw = (headers as Record<string, unknown>).cookie;
		cookieHeader = typeof raw === "string" ? raw : null;
	}
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(";")) {
		const [key, ...rest] = part.trim().split("=");
		if (key === name) return decodeURIComponent(rest.join("="));
	}
	return null;
}
