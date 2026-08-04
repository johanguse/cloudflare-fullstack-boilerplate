import { maskEmail } from "@server/lib/mask";
import { evaluateReferralReward } from "@server/lib/referral";
import {
	buildReferralLink,
	isValidReferralSlug,
	normalizeReferralSlug,
	REFERRAL_MONTHLY_REWARD_CAP,
} from "@shared/referral";
import { describe, expect, it } from "vitest";

describe("referral slug validation", () => {
	it("accepts valid lowercase slugs", () => {
		expect(isValidReferralSlug("johndoe")).toBe(true);
		expect(isValidReferralSlug("john-doe-99")).toBe(true);
		expect(isValidReferralSlug("ab1c")).toBe(true);
	});

	it("rejects too-short, edge-hyphen, uppercase, and reserved slugs", () => {
		expect(isValidReferralSlug("ab")).toBe(false);
		expect(isValidReferralSlug("-abc")).toBe(false);
		expect(isValidReferralSlug("abc-")).toBe(false);
		expect(isValidReferralSlug("JohnDoe")).toBe(false);
		expect(isValidReferralSlug("john doe")).toBe(false);
		expect(isValidReferralSlug("admin")).toBe(false);
		expect(isValidReferralSlug("register")).toBe(false);
	});

	it("normalizes input before validation", () => {
		expect(normalizeReferralSlug("  JohnDoe  ")).toBe("johndoe");
	});

	it("builds a referral link", () => {
		expect(buildReferralLink("https://app.test/", "abc1")).toBe(
			"https://app.test/r/abc1",
		);
	});
});

describe("maskEmail", () => {
	it("masks the local part", () => {
		expect(maskEmail("ada@example.com")).toBe("a***@example.com");
	});

	it("handles malformed emails", () => {
		expect(maskEmail("notanemail")).toBe("***");
	});
});

describe("evaluateReferralReward", () => {
	it("rejects self-referral", () => {
		expect(
			evaluateReferralReward({
				referrerUserId: "u1",
				referredUserId: "u1",
				monthlyRewardCount: 0,
			}),
		).toEqual({ ok: false, reason: "self_referral" });
	});

	it("rejects once the monthly cap is reached", () => {
		expect(
			evaluateReferralReward({
				referrerUserId: "u1",
				referredUserId: "u2",
				monthlyRewardCount: REFERRAL_MONTHLY_REWARD_CAP,
			}),
		).toEqual({ ok: false, reason: "monthly_cap" });
	});

	it("accepts an eligible referral under the cap", () => {
		expect(
			evaluateReferralReward({
				referrerUserId: "u1",
				referredUserId: "u2",
				monthlyRewardCount: REFERRAL_MONTHLY_REWARD_CAP - 1,
			}),
		).toEqual({ ok: true });
	});
});
