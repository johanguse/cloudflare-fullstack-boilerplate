import { applyD1Migrations, type D1Migration, env } from "cloudflare:test";
import {
	parseStagingSeedPasswords,
	STAGING_SEED_EMAILS,
} from "@server/db/seeds/staging-credentials";
import { createAuth } from "@server/lib/auth";
import {
	AUTH_CAPTCHA_ENDPOINTS,
	createAuthRateLimiter,
	requireAuthSecret,
} from "@server/lib/auth-security";
import type { AppEnv } from "@server/lib/types";
import { userRouter } from "@server/routers/trpc/user";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/d1";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const bindings = env as unknown as {
	AUTH_TEST_DB: D1Database;
	AUTH_TEST_MIGRATIONS: D1Migration[];
};
const db = bindings.AUTH_TEST_DB;
const secret = "auth-regression-dummy-secret-at-least-32-characters";
const origin = "https://auth.example.test";
const email = "owner@example.test";
const password = "Dummy-regression-password-123!";
const testEnv = {
	DB: db,
	ENVIRONMENT: "development",
	BETTER_AUTH_SECRET: secret,
	BETTER_AUTH_URL: origin,
	TRUSTED_ORIGINS: origin,
} as AppEnv;
const makeAuth = () => createAuth(drizzle(db), testEnv);
const headers = (ip = "192.0.2.1") =>
	new Headers({
		"Content-Type": "application/json",
		Origin: origin,
		"CF-Connecting-IP": ip,
	});
const request = (path: string, body: unknown, ip?: string) =>
	new Request(`${origin}/api/auth${path}`, {
		method: "POST",
		headers: headers(ip),
		body: JSON.stringify(body),
	});

beforeAll(() => applyD1Migrations(db, bindings.AUTH_TEST_MIGRATIONS));
beforeEach(async () => {
	await db.batch(
		["session", "account", "user", "verification", "auth_rate_limits"].map(
			(table) => db.prepare(`DELETE FROM ${table}`),
		),
	);
});
afterEach(() => vi.restoreAllMocks());

async function createOwner() {
	const auth = makeAuth();
	const ctx = await auth.$context;
	await db
		.prepare(
			"INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
		)
		.bind("owner", "Dummy owner", email, Date.now() / 1000, Date.now() / 1000)
		.run();
	await ctx.internalAdapter.createAccount({
		userId: "owner",
		accountId: "owner",
		providerId: "credential",
		password: await ctx.password.hash(password),
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	return auth;
}

async function signIn(auth: ReturnType<typeof makeAuth>) {
	const response = await auth.api.signInEmail({
		body: { email, password },
		headers: headers(),
		asResponse: true,
	});
	expect(response.status).toBe(200);
	const cookie = response.headers
		.getSetCookie()
		.map((value) => value.split(";")[0])
		.join("; ");
	return new Headers({ Cookie: cookie });
}

describe("auth credentials", () => {
	it.each([
		undefined,
		"",
		"too-short",
		"better-auth-secret-12345678901234567890",
		"your-random-32-char-secret-here",
	])("rejects an unsafe secret (%s)", (value) => {
		expect(() => requireAuthSecret(value)).toThrow("BETTER_AUTH_SECRET");
	});
	it("accepts a private secret and fails closed before creating auth without one", () => {
		expect(requireAuthSecret(secret)).toBe(secret);
		expect(() =>
			createAuth(drizzle(db), { ...testEnv, BETTER_AUTH_SECRET: "" }),
		).toThrow("BETTER_AUTH_SECRET");
		expect(() =>
			createAuth(drizzle(db), { ...testEnv, ENVIRONMENT: "production" }),
		).toThrow("TURNSTILE_SECRET_KEY");
	});
	it("requires distinct operator-supplied staging passwords and never echoes malformed input", () => {
		const passwords = Object.fromEntries(
			STAGING_SEED_EMAILS.map((address, i) => [
				address,
				`private-dummy-password-${i}`,
			]),
		);
		expect(parseStagingSeedPasswords(JSON.stringify(passwords))).toEqual(
			passwords,
		);
		expect(() => parseStagingSeedPasswords(undefined)).toThrow(
			"STAGING_SEED_PASSWORDS",
		);
		expect(() => parseStagingSeedPasswords('{"private-secret":')).toThrow(
			/^STAGING_SEED_PASSWORDS/,
		);
		expect(() =>
			parseStagingSeedPasswords(
				JSON.stringify({ ...passwords, "admin@example.com": "Admin1234!" }),
			),
		).toThrow("20–128");
		expect(() =>
			parseStagingSeedPasswords(
				JSON.stringify(
					Object.fromEntries(
						STAGING_SEED_EMAILS.map((address) => [
							address,
							"same-private-dummy-password",
						]),
					),
				),
			),
		).toThrow("different password");
	});
});

describe("atomic auth budgets", () => {
	it("admits only three concurrent requests and stores no raw email or IP", async () => {
		const limiter = createAuthRateLimiter(db, secret);
		const results = await Promise.all(
			Array.from({ length: 20 }, () =>
				limiter.consume(`recipient:${email}`, { window: 60, max: 3 }),
			),
		);
		expect(results.filter((result) => result.allowed)).toHaveLength(3);
		const row = await db
			.prepare("SELECT key, count FROM auth_rate_limits")
			.first<{ key: string; count: number }>();
		expect(row?.key).toMatch(/^[a-f0-9]{64}$/);
		expect(row?.count).toBe(3);
	});
	it("keeps the expiry fixed when denied and resets the budget after expiry", async () => {
		const limiter = createAuthRateLimiter(db, secret);
		await limiter.consume("one", { window: 60, max: 1 });
		const before = await db
			.prepare("SELECT expires_at FROM auth_rate_limits")
			.first();
		expect(await limiter.consume("one", { window: 60, max: 1 })).toMatchObject({
			allowed: false,
		});
		expect(
			await db.prepare("SELECT expires_at FROM auth_rate_limits").first(),
		).toEqual(before);
		await db.prepare("UPDATE auth_rate_limits SET expires_at = 0").run();
		expect(await limiter.consume("one", { window: 60, max: 1 })).toEqual({
			allowed: true,
			retryAfter: null,
		});
		expect(
			await db.prepare("SELECT count FROM auth_rate_limits").first(),
		).toEqual({ count: 1 });
	});
	it("throttles in development too, using CF-Connecting-IP rather than caller XFF", async () => {
		const auth = makeAuth();
		for (let i = 0; i < 3; i++) {
			const req = request("/sign-in/email", { email, password });
			req.headers.set("X-Forwarded-For", `198.51.100.${i + 1}`);
			expect((await auth.handler(req)).status).toBe(401);
		}
		expect(
			(await auth.handler(request("/sign-in/email", { email, password })))
				.status,
		).toBe(429);
		expect(
			(
				await auth.handler(
					request("/sign-in/email", { email, password }, "192.0.2.2"),
				)
			).status,
		).toBe(401);
	});
	it("shares recipient budgets across IPs, case variations and email routes", async () => {
		const auth = makeAuth();
		for (let i = 0; i < 5; i++) {
			const response = await auth.handler(
				request(
					"/request-password-reset",
					{ email: i % 2 ? email.toUpperCase() : email },
					`192.0.2.${i + 1}`,
				),
			);
			expect(response.status).toBe(200);
		}
		const denied = await auth.handler(
			request(
				"/email-otp/send-verification-otp",
				{ email, type: "email-verification" },
				"192.0.2.6",
			),
		);
		expect(denied.status).toBe(429);
		expect(denied.headers.get("Retry-After")).toBeTruthy();
	});
	it.each(AUTH_CAPTCHA_ENDPOINTS)(
		"requires captcha on %s before contacting the provider",
		async (path) => {
			const auth = createAuth(drizzle(db), {
				...testEnv,
				TURNSTILE_SECRET_KEY: "dummy-do-not-contact-provider",
			});
			const response = await auth.handler(
				request(path, {
					email,
					password,
					name: "Dummy",
					type: "email-verification",
					newEmail: email,
				}),
			);
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({ code: "MISSING_RESPONSE" });
		},
	);
});

describe("D1 verification and revocation", () => {
	it("consumes a verification value only once across separate auth instances", async () => {
		const ctx = await makeAuth().$context;
		await ctx.internalAdapter.createVerificationValue({
			identifier: "single-use",
			value: "dummy",
			expiresAt: new Date(Date.now() + 60_000),
		});
		const results = await Promise.all(
			Array.from({ length: 10 }, async () =>
				(await makeAuth().$context).internalAdapter.consumeVerificationValue(
					"single-use",
				),
			),
		);
		expect(results.filter(Boolean)).toHaveLength(1);
	});
	it("stores hashed OTPs and accepts a correct OTP only once under concurrency", async () => {
		const auth = await createOwner();
		const otp = await auth.api.createVerificationOTP({
			body: { email, type: "email-verification" },
		});
		const record = await db
			.prepare("SELECT value FROM verification")
			.first<{ value: string }>();
		expect(record?.value).not.toContain(otp);
		const responses = await Promise.all(
			Array.from({ length: 10 }, (_, i) =>
				makeAuth().api.verifyEmailOTP({
					body: { email, otp },
					headers: headers(`192.0.2.${i + 1}`),
					asResponse: true,
				}),
			),
		);
		expect(
			responses.filter((response) => response.status === 200),
		).toHaveLength(1);
	});
	it("exhausts an OTP after three incorrect guesses", async () => {
		const auth = await createOwner();
		const otp = await auth.api.createVerificationOTP({
			body: { email, type: "email-verification" },
		});
		const wrong = otp === "000000" ? "111111" : "000000";
		for (let i = 0; i < 3; i++) {
			expect(
				(
					await auth.api.verifyEmailOTP({
						body: { email, otp: wrong },
						asResponse: true,
					})
				).status,
			).toBe(400);
		}
		expect(
			(
				await auth.api.verifyEmailOTP({
					body: { email, otp },
					asResponse: true,
				})
			).status,
		).toBe(403);
	});
	it.each(["link", "otp"] as const)(
		"revokes both existing sessions after a %s password reset",
		async (kind) => {
			const auth = await createOwner();
			const first = await signIn(auth);
			const second = await signIn(auth);
			const ctx = await auth.$context;
			let response: Response;
			if (kind === "link") {
				await ctx.internalAdapter.createVerificationValue({
					identifier: "reset-password:dummy-token",
					value: "owner",
					expiresAt: new Date(Date.now() + 60_000),
				});
				response = await auth.api.resetPassword({
					body: {
						token: "dummy-token",
						newPassword: "New-dummy-password-123!",
					},
					asResponse: true,
				});
			} else {
				const otp = await auth.api.createVerificationOTP({
					body: { email, type: "forget-password" },
				});
				response = await auth.api.resetPasswordEmailOTP({
					body: { email, otp, password: "New-dummy-password-123!" },
					asResponse: true,
				});
			}
			expect(response.status).toBe(200);
			expect(await auth.api.getSession({ headers: first })).toBeNull();
			expect(await auth.api.getSession({ headers: second })).toBeNull();
		},
	);
	it("ignores an old signed cookie cache after server-side revocation", async () => {
		const auth = await createOwner();
		const cachedAuth = betterAuth({
			...auth.options,
			session: {
				...auth.options.session,
				cookieCache: { enabled: true, maxAge: 300 },
			},
		});
		const response = await cachedAuth.api.signInEmail({
			body: { email, password },
			headers: headers(),
			asResponse: true,
		});
		expect(response.status).toBe(200);
		const cookie = response.headers
			.getSetCookie()
			.map((value) => value.split(";")[0])
			.join("; ");
		expect(cookie).toContain("session_data");
		await (await auth.$context).internalAdapter.deleteUserSessions("owner");
		expect(
			await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) }),
		).toBeNull();
	});
	it("account deletion revokes other device cookies and removes the user", async () => {
		const auth = await createOwner();
		const first = await signIn(auth);
		const otherDevice = await signIn(auth);
		const active = await auth.api.getSession({ headers: first });
		expect(active).not.toBeNull();
		const caller = userRouter.createCaller({
			db: drizzle(db),
			env: testEnv,
			headers: first,
			session: active?.session ?? null,
		});
		expect(await caller.deleteAccount({})).toEqual({ success: true });
		expect(await auth.api.getSession({ headers: first })).toBeNull();
		expect(await auth.api.getSession({ headers: otherDevice })).toBeNull();
		expect(
			await db.prepare("SELECT id FROM user WHERE id = 'owner'").first(),
		).toBeNull();
	});
});
