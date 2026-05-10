import type { AppEnv } from "@server/lib/types";
import { appRouter } from "@server/routers";
import { describe, expect, it } from "vitest";

const stubEnv = {
	ENVIRONMENT: "test",
} as AppEnv;

describe("tRPC protectedProcedure", () => {
	it("rejects user.getProfile without session", async () => {
		const caller = appRouter.createCaller({
			session: null,
			db: null as never,
			env: stubEnv,
		});

		await expect(caller.user.getProfile()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("rejects billing.getBalance without session", async () => {
		const caller = appRouter.createCaller({
			session: null,
			db: null as never,
			env: stubEnv,
		});

		await expect(caller.billing.getBalance()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("rejects invoices.list without session", async () => {
		const caller = appRouter.createCaller({
			session: null,
			db: null as never,
			env: stubEnv,
		});

		await expect(caller.invoices.list({})).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("rejects nfse.getSettings without session", async () => {
		const caller = appRouter.createCaller({
			session: null,
			db: null as never,
			env: stubEnv,
		});

		await expect(caller.nfse.getSettings()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});
});
