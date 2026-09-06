import { defineConfig } from "drizzle-kit";
import { getLocalSQLiteDBPath } from "./src/server/db/utils";

const environment = process.env.ENVIRONMENT ?? "development";
const isProd = environment === "production";
const isStaging = environment === "staging";

function getDatabaseId() {
	if (isStaging) {
		const id = process.env.CLOUDFLARE_DATABASE_ID_STAGING;
		if (!id)
			throw new Error("CLOUDFLARE_DATABASE_ID_STAGING is required for staging");
		return id;
	}
	if (isProd) {
		const id = process.env.CLOUDFLARE_DATABASE_ID_PRODUCTION;
		if (!id)
			throw new Error(
				"CLOUDFLARE_DATABASE_ID_PRODUCTION is required for production",
			);
		return id;
	}
	const id = process.env.CLOUDFLARE_DATABASE_ID_LOCAL;
	if (!id)
		throw new Error(
			"CLOUDFLARE_DATABASE_ID_LOCAL is required for local development",
		);
	return id;
}

function requireEnv(name: "CLOUDFLARE_ACCOUNT_ID" | "CLOUDFLARE_API_TOKEN") {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required for ${environment}`);
	return value;
}

export default defineConfig({
	dialect: "sqlite",
	schema: "./src/server/db/schema",
	out: "./src/server/db/migrations",
	...(isProd || isStaging
		? {
				driver: "d1-http",
				dbCredentials: {
					accountId: requireEnv("CLOUDFLARE_ACCOUNT_ID"),
					databaseId: getDatabaseId(),
					token: requireEnv("CLOUDFLARE_API_TOKEN"),
				},
			}
		: {
				dbCredentials: {
					url: getLocalSQLiteDBPath(),
				},
			}),
});
