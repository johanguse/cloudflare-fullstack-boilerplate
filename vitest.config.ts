import path from "node:path";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	resolve: {
		alias: {
			"@client": path.resolve(__dirname, "./src/client/"),
			"@server": path.resolve(__dirname, "./src/server/"),
			"@shared": path.resolve(__dirname, "./src/shared/"),
		},
	},
	test: {
		globals: true,
		poolOptions: {
			workers: {
				main: "./test/fixtures/minimal-worker.ts",
				miniflare: {
					compatibilityDate: "2026-03-10",
					compatibilityFlags: ["nodejs_compat"],
					bindings: { ENVIRONMENT: "test" },
				},
			},
		},
		include: ["test/**/*.spec.ts", "test/**/*.test.ts"],
		exclude: ["node_modules", "dist"],
		testTimeout: 15_000,
	},
});
