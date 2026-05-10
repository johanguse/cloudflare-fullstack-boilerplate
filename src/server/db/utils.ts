import fs from "node:fs";
import path from "node:path";

/**
 * Returns the path to the most recent local Wrangler SQLite file.
 * Used by Drizzle Kit for local migrations and Drizzle Studio.
 * Executed in Node.js context (not Workers runtime).
 */
export function getLocalSQLiteDBPath() {
	try {
		const basePath = path.resolve(".wrangler");

		const files = fs
			.readdirSync(basePath, { encoding: "utf-8", recursive: true })
			.filter((fileName) => fileName.endsWith(".sqlite"));

		if (!files.length) {
			throw new Error(`No .sqlite file found at ${basePath}`);
		}

		files.sort((a, b) => {
			const statA = fs.statSync(path.join(basePath, a));
			const statB = fs.statSync(path.join(basePath, b));
			return statB.mtime.getTime() - statA.mtime.getTime();
		});

		const fullPath = path.resolve(basePath, files[0]);
		return `file:${fullPath}`;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Error resolving local D1 DB: ${error.message}`);
		}
		throw new Error("Error resolving local D1 DB");
	}
}
