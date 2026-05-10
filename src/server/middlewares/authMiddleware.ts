import { drizzle } from "drizzle-orm/d1";
import type { MiddlewareHandler } from "hono";
import { createAuth } from "../lib/auth";
import type { AppBindings } from "../lib/types";

const authMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
	const db = drizzle(c.env.DB);
	const authInstance = createAuth(db, c.env);
	c.set("db", db);
	c.set("auth", authInstance);
	return next();
};

export default authMiddleware;
