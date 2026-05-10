import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import type { AppEnv as Env } from "../lib/types";

export function initDb(env: Env): DrizzleD1Database {
	return drizzle(env.DB);
}

export type DBInstance = DrizzleD1Database;
