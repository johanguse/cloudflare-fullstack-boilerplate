import path from "node:path";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest({
			main: "./test/fixtures/minimal-worker.ts",
			miniflare: {
				compatibilityDate: "2026-03-10",
				compatibilityFlags: ["nodejs_compat"],
				bindings: { ENVIRONMENT: "test" },
			},
		}),
	],
	resolve: {
		alias: {
			"@client": path.resolve(__dirname, "./src/client/"),
			"@server": path.resolve(__dirname, "./src/server/"),
			"@shared": path.resolve(__dirname, "./src/shared/"),
		},
	},
	test: {
		globals: true,
		include: ["test/**/*.spec.ts", "test/**/*.test.ts"],
		exclude: ["node_modules", "dist"],
		testTimeout: 15_000,
	},
});
