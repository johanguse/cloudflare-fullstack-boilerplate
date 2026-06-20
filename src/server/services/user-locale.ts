import { eq } from "drizzle-orm";
import type { DBInstance } from "../db";
import * as schema from "../db/schema/auth";

export async function getUserLocale(
	db: DBInstance,
	userId: string,
): Promise<string> {
	const row = await db
		.select({ locale: schema.user.locale })
		.from(schema.user)
		.where(eq(schema.user.id, userId))
		.get();
	return row?.locale ?? "en";
}
