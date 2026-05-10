import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
	// Replace with your actual project ref from app.trigger.dev
	project: "proj_yourprojectref",
	dirs: ["./trigger"],
	runtime: "node",
	logLevel: "info",
	retries: {
		enabledInDev: false,
		default: {
			maxAttempts: 3,
			minTimeoutInMs: 1000,
			maxTimeoutInMs: 10000,
			factor: 2,
			randomize: true,
		},
	},
	maxDuration: 300,
	build: {
		autoDetectExternal: true,
		keepNames: true,
		minify: false,
		extensions: [],
	},
});
