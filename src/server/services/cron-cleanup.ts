import { lt } from "drizzle-orm";
import type { DBInstance } from "../db";
import { session, verification } from "../db/schema/auth";

/**
 * Deletes expired Better Auth verification rows and session rows (daily cron).
 */
export async function runScheduledCleanup(db: DBInstance): Promise<void> {
	const now = new Date();
	await db.delete(verification).where(lt(verification.expiresAt, now)).run();
	await db.delete(session).where(lt(session.expiresAt, now)).run();
}
