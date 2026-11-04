import path from "node:path";
import {
	cloudflareTest,
	readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const authMigrations = await readD1Migrations("./src/server/db/migrations");

export default defineConfig({
	plugins: [
		cloudflareTest({
			main: "./test/fixtures/minimal-worker.ts",
			miniflare: {
				compatibilityDate: "2026-03-10",
				compatibilityFlags: ["nodejs_compat"],
				d1Databases: ["AUTH_TEST_DB"],
				bindings: { ENVIRONMENT: "test", AUTH_TEST_MIGRATIONS: authMigrations },
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
