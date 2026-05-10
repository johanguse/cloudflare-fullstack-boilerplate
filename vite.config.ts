import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const environment = process.env.CLOUDFLARE_ENVIRONMENT ?? "local";
console.log(`Building for environment: ${environment}`);

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

const sentryPlugins =
	sentryAuthToken && sentryOrg && sentryProject
		? [
				sentryVitePlugin({
					org: sentryOrg,
					project: sentryProject,
					authToken: sentryAuthToken,
				}),
			]
		: [];

export default defineConfig({
	resolve: {
		alias: {
			"@client": path.resolve(__dirname, "./src/client/"),
			"@server": path.resolve(__dirname, "./src/server/"),
			"@shared": path.resolve(__dirname, "./src/shared/"),
		},
	},
	plugins: [
		...sentryPlugins,
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			routesDirectory: "src/client/routes",
			generatedRouteTree: "src/client/routeTree.gen.ts",
			routeToken: "route",
		}),
		react(),
		cloudflare({
			viteEnvironment: {
				name: environment,
			},
		}),
		tailwindcss(),
	],
	define: {
		"process.env.CLOUDFLARE_ENVIRONMENT": JSON.stringify(environment),
		"import.meta.env.VITE_ENVIRONMENT": JSON.stringify(environment),
	},
	build: {
		outDir: "dist",
		assetsDir: "client/assets",
		sourcemap: environment !== "local",
		rollupOptions: {
			external: ["undici"],
			output: {
				manualChunks(id) {
					if (id.includes("node_modules")) {
						if (id.includes("@trigger.dev")) return "trigger";
						if (id.includes("recharts") || id.includes("d3-")) return "charts";
						return "vendor";
					}
				},
				chunkFileNames: "client/assets/[name]-[hash].js",
				entryFileNames: "[name].js",
				assetFileNames: "client/assets/[name]-[hash][extname]",
			},
		},
	},
});
