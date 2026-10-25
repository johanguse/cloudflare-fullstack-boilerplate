import * as Sentry from "@sentry/react";
import { getSentryDataCollection } from "@shared/sentry";
import { describe, expect, it } from "vitest";

describe("Sentry React v11", () => {
	it("captures React error-boundary errors with the restrictive collection policy", async () => {
		const envelopes: Sentry.Envelope[] = [];
		const client = Sentry.init({
			dsn: "https://public@example.invalid/1",
			defaultIntegrations: false,
			integrations: [Sentry.linkedErrorsIntegration()],
			dataCollection: getSentryDataCollection(),
			transport: () => ({
				send: async (envelope: Sentry.Envelope) => {
					envelopes.push(envelope);
					return { statusCode: 200 };
				},
				flush: async () => true,
			}),
		});
		try {
			expect(client).toBeDefined();
			expect(client?.getOptions().dataCollection).toMatchObject({
				userInfo: false,
				cookies: false,
				httpBodies: [],
				databaseQueryData: false,
				genAI: { inputs: false, outputs: false },
			});
			Sentry.captureReactException(new Error("react-migration-test"), {
				componentStack: "\n at LocalTestComponent (fixture.tsx:1:1)",
			});
			await client?.flush(1000);
			const events = envelopes.flatMap(([, items]) =>
				items
					.filter(([header]) => header.type === "event")
					.map(([, event]) => event as Sentry.Event),
			);
			expect(events).toHaveLength(1);
			expect(events[0].exception?.values?.[0].value).toBe(
				"react-migration-test",
			);
			expect(JSON.stringify(events[0].exception)).toContain(
				"LocalTestComponent",
			);
		} finally {
			await client?.close(1000);
		}
	});
});
