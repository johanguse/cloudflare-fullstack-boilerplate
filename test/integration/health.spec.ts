import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("GET /api/v1/health", () => {
	it("returns JSON ok", async () => {
		const res = await SELF.fetch("http://example.com/api/v1/health");
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			status: string;
			environment: string;
		};
		expect(body.status).toBe("ok");
		expect(body.environment).toBe("test");
	});
});
