import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
	isValidReferralSlug,
	normalizeReferralSlug,
	REFERRAL_MONTHLY_REWARD_CAP,
	REFERRED_REWARD_CREDITS,
	REFERRER_REWARD_CREDITS,
} from "../../shared/referral";
import type { DBInstance } from "../db";
import * as authSchema from "../db/schema/auth";
import * as schema from "../db/schema/referral";
import { maskEmail } from "../lib/mask";
import { evaluateReferralReward, generateReferralCode } from "../lib/referral";
import { addCredits } from "./credits";

/**
 * Get the caller's referral code, generating and persisting one on first use.
 * Retries a handful of times on the (astronomically unlikely) code collision.
 */
export async function getOrCreateReferralCode(
	db: DBInstance,
	userId: string,
): Promise<string> {
	const existing = await db
		.select({ code: schema.referralCodes.code })
		.from(schema.referralCodes)
		.where(eq(schema.referralCodes.userId, userId))
		.get();
	if (existing) return existing.code;

	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generateReferralCode();
		const inserted = await db
			.insert(schema.referralCodes)
			.values({ id: crypto.randomUUID(), userId, code })
			.onConflictDoNothing()
			.returning({ code: schema.referralCodes.code });

		if (inserted[0]) return inserted[0].code;

		// Conflict could be on user_id (a concurrent request created the row) or on
		// the code. Re-read by user_id — if present, that's our code; else the code
		// collided and we retry with a fresh one.
		const row = await db
			.select({ code: schema.referralCodes.code })
			.from(schema.referralCodes)
			.where(eq(schema.referralCodes.userId, userId))
			.get();
		if (row) return row.code;
	}

	throw new Error("Failed to generate a unique referral code");
}

/** Update the caller's referral slug. Throws on invalid or already-taken slugs. */
export async function setReferralSlug(
	db: DBInstance,
	userId: string,
	rawSlug: string,
): Promise<{ code: string }> {
	const slug = normalizeReferralSlug(rawSlug);
	if (!isValidReferralSlug(slug)) {
		throw new Error("INVALID_SLUG");
	}

	// Ensure the user has a code row first.
	await getOrCreateReferralCode(db, userId);

	const taken = await db
		.select({ userId: schema.referralCodes.userId })
		.from(schema.referralCodes)
		.where(eq(schema.referralCodes.code, slug))
		.get();
	if (taken && taken.userId !== userId) {
		throw new Error("SLUG_TAKEN");
	}
	if (taken && taken.userId === userId) {
		return { code: slug };
	}

	await db
		.update(schema.referralCodes)
		.set({ code: slug, updatedAt: new Date() })
		.where(eq(schema.referralCodes.userId, userId));

	return { code: slug };
}

/**
 * Record referral attribution when a new user signs up via a `/r/:code` link.
 * No-ops on unknown codes, self-referral, or a user who is already attributed.
 */
export async function recordReferralAttribution(
	db: DBInstance,
	params: { code: string; referredUserId: string },
): Promise<void> {
	const code = normalizeReferralSlug(params.code);
	if (!isValidReferralSlug(code)) return;

	const referrer = await db
		.select({ userId: schema.referralCodes.userId })
		.from(schema.referralCodes)
		.where(eq(schema.referralCodes.code, code))
		.get();
	if (!referrer) return;

	// Self-referral guard: a user cannot refer themselves.
	if (referrer.userId === params.referredUserId) return;

	// `referredUserId` is unique, so onConflictDoNothing makes this safe to call
	// repeatedly and prevents overwriting an existing attribution.
	await db
		.insert(schema.referrals)
		.values({
			id: crypto.randomUUID(),
			referrerUserId: referrer.userId,
			referredUserId: params.referredUserId,
			code,
			status: "pending",
		})
		.onConflictDoNothing();
}

export type ProcessReferralResult =
	| { status: "rewarded"; referrerUserId: string }
	| { status: "none" }
	| { status: "already_rewarded" }
	| { status: "rejected"; reason: string };

/**
 * Award referral credits after the referred user's first successful subscription
 * payment. Safe to call more than once — idempotent on the reward record — and
 * enforces self-referral, duplicate-payment-identity, and monthly-cap checks.
 */
export async function processReferralReward(
	db: DBInstance,
	params: {
		referredUserId: string;
		paymentIdentity: string;
		stripePaymentIntentId?: string | null;
	},
): Promise<ProcessReferralResult> {
	const referral = await db
		.select()
		.from(schema.referrals)
		.where(eq(schema.referrals.referredUserId, params.referredUserId))
		.get();

	if (!referral || referral.status === "rejected") return { status: "none" };

	// Already paid out (idempotency): a reward row exists for this referral.
	const existingReward = await db
		.select({ id: schema.referralRewards.id })
		.from(schema.referralRewards)
		.where(eq(schema.referralRewards.referralId, referral.id))
		.get();
	if (existingReward) return { status: "already_rewarded" };

	const markRejected = async (reason: string) => {
		await db
			.update(schema.referrals)
			.set({ status: "rejected", rejectionReason: reason, updatedAt: new Date() })
			.where(eq(schema.referrals.id, referral.id));
	};

	// Duplicate-payment-identity: the same paying identity may only ever generate
	// a single referral reward across the whole program.
	const dupIdentity = await db
		.select({ id: schema.referralRewards.id })
		.from(schema.referralRewards)
		.where(eq(schema.referralRewards.paymentIdentity, params.paymentIdentity))
		.get();
	if (dupIdentity) {
		await markRejected("duplicate_payment_identity");
		return { status: "rejected", reason: "duplicate_payment_identity" };
	}

	// Monthly cap: count this referrer's rewards in the current calendar month.
	const monthStart = new Date();
	monthStart.setUTCDate(1);
	monthStart.setUTCHours(0, 0, 0, 0);
	const monthlyRow = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.referralRewards)
		.where(
			and(
				eq(schema.referralRewards.referrerUserId, referral.referrerUserId),
				gte(schema.referralRewards.createdAt, monthStart),
			),
		)
		.get();

	const decision = evaluateReferralReward({
		referrerUserId: referral.referrerUserId,
		referredUserId: referral.referredUserId,
		monthlyRewardCount: monthlyRow?.count ?? 0,
	});
	if (!decision.ok) {
		await markRejected(decision.reason);
		return { status: "rejected", reason: decision.reason };
	}

	// Insert the idempotent reward record first. The unique constraints on
	// `referralId` and `paymentIdentity` make this the source of truth; if a
	// concurrent run beat us here, nothing is inserted and we stop.
	const rewardInserted = await db
		.insert(schema.referralRewards)
		.values({
			id: crypto.randomUUID(),
			referralId: referral.id,
			referrerUserId: referral.referrerUserId,
			referredUserId: referral.referredUserId,
			referrerCredits: REFERRER_REWARD_CREDITS,
			referredCredits: REFERRED_REWARD_CREDITS,
			paymentIdentity: params.paymentIdentity,
			stripePaymentIntentId: params.stripePaymentIntentId ?? null,
		})
		.onConflictDoNothing()
		.returning({ id: schema.referralRewards.id });

	if (!rewardInserted[0]) return { status: "already_rewarded" };

	await db
		.update(schema.referrals)
		.set({ status: "rewarded", rejectionReason: null, updatedAt: new Date() })
		.where(eq(schema.referrals.id, referral.id));

	await addCredits(
		db,
		referral.referrerUserId,
		REFERRER_REWARD_CREDITS,
		"referral",
		"Referral reward — a friend you invited subscribed",
		params.stripePaymentIntentId ?? undefined,
	);
	await addCredits(
		db,
		referral.referredUserId,
		REFERRED_REWARD_CREDITS,
		"referral",
		"Referral bonus — welcome credits from your invite",
		params.stripePaymentIntentId ?? undefined,
	);

	return { status: "rewarded", referrerUserId: referral.referrerUserId };
}

export interface ReferralDashboard {
	code: string;
	stats: {
		total: number;
		pending: number;
		rewarded: number;
		creditsEarned: number;
	};
	rewardCredits: { referrer: number; referred: number };
	monthlyCap: number;
}

/** Dashboard summary: the caller's code plus aggregate referral stats. */
export async function getReferralDashboard(
	db: DBInstance,
	userId: string,
): Promise<ReferralDashboard> {
	const code = await getOrCreateReferralCode(db, userId);

	const rows = await db
		.select({ status: schema.referrals.status })
		.from(schema.referrals)
		.where(eq(schema.referrals.referrerUserId, userId))
		.all();

	const rewardedRow = await db
		.select({
			credits: sql<number>`coalesce(sum(${schema.referralRewards.referrerCredits}), 0)`,
		})
		.from(schema.referralRewards)
		.where(eq(schema.referralRewards.referrerUserId, userId))
		.get();

	const pending = rows.filter((r) => r.status === "pending").length;
	const rewarded = rows.filter((r) => r.status === "rewarded").length;

	return {
		code,
		stats: {
			total: rows.length,
			pending,
			rewarded,
			creditsEarned: rewardedRow?.credits ?? 0,
		},
		rewardCredits: {
			referrer: REFERRER_REWARD_CREDITS,
			referred: REFERRED_REWARD_CREDITS,
		},
		monthlyCap: REFERRAL_MONTHLY_REWARD_CAP,
	};
}

export interface ReferralListItem {
	id: string;
	email: string;
	name: string | null;
	status: "pending" | "rewarded" | "rejected";
	createdAt: Date;
}

/** Paginated list of the caller's referrals, with masked referred-user emails. */
export async function listReferrals(
	db: DBInstance,
	userId: string,
	opts: { limit: number; offset: number },
): Promise<ReferralListItem[]> {
	const rows = await db
		.select({
			id: schema.referrals.id,
			status: schema.referrals.status,
			createdAt: schema.referrals.createdAt,
			email: authSchema.user.email,
			name: authSchema.user.name,
		})
		.from(schema.referrals)
		.innerJoin(
			authSchema.user,
			eq(authSchema.user.id, schema.referrals.referredUserId),
		)
		.where(eq(schema.referrals.referrerUserId, userId))
		.orderBy(desc(schema.referrals.createdAt))
		.limit(opts.limit)
		.offset(opts.offset)
		.all();

	return rows.map((r) => ({
		id: r.id,
		email: maskEmail(r.email),
		name: r.name,
		status: r.status,
		createdAt: r.createdAt,
	}));
}
