import { customAlphabet } from "nanoid";
import { REFERRAL_MONTHLY_REWARD_CAP } from "../../shared/referral";

// 8-char lowercase alphanumeric codes. Lowercase keeps the `/r/:code` links tidy
// and consistent with the custom-slug rules. Excludes ambiguous 0/o/1/l/i.
export const generateReferralCode = customAlphabet(
	"abcdefghjkmnpqrstuvwxyz23456789",
	8,
);

export type ReferralRewardDecision =
	| { ok: true }
	| { ok: false; reason: "self_referral" | "monthly_cap" };

/**
 * Pure eligibility check for a pending referral, isolated for unit testing.
 * Duplicate-payment-identity is enforced separately at the database layer.
 */
export function evaluateReferralReward(input: {
	referrerUserId: string;
	referredUserId: string;
	monthlyRewardCount: number;
	monthlyCap?: number;
}): ReferralRewardDecision {
	if (input.referrerUserId === input.referredUserId) {
		return { ok: false, reason: "self_referral" };
	}
	const cap = input.monthlyCap ?? REFERRAL_MONTHLY_REWARD_CAP;
	if (input.monthlyRewardCount >= cap) {
		return { ok: false, reason: "monthly_cap" };
	}
	return { ok: true };
}
