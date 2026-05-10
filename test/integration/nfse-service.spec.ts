import { FiscalNacionalService } from "@server/services/nfse";
import { describe, expect, it } from "vitest";

describe("FiscalNacionalService", () => {
	it("constructs for staging without network", () => {
		const svc = new FiscalNacionalService("test-api-key", "staging");
		expect(svc).toBeDefined();
	});
});
