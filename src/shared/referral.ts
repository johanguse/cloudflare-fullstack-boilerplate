// Referral program constants and slug validation shared between client and server.
//
// Program design: "Give 50 reports, get 50 reports". Both the referrer and the
// referred customer receive credits, but only once the referred customer's first
// subscription payment succeeds (never on signup alone). See the referral service
// for the reward pipeline and abuse checks.

/** Credits granted to the referrer when a referral qualifies. */
export const REFERRER_REWARD_CREDITS = 50;
/** Credits granted to the newly referred customer when their referral qualifies. */
export const REFERRED_REWARD_CREDITS = 50;
/** Maximum number of referrals a single referrer can be rewarded for per calendar month. */
export const REFERRAL_MONTHLY_REWARD_CAP = 20;

/** Cookie that carries the referral code from a `/r/:code` link into signup. */
export const REFERRAL_COOKIE_NAME = "referral_code";
/** How long the referral attribution cookie lives, in seconds (30 days). */
export const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export const REFERRAL_SLUG_MIN_LENGTH = 4;
export const REFERRAL_SLUG_MAX_LENGTH = 32;

// Lowercase letters, digits and internal hyphens; must start and end alphanumeric.
// Matches both auto-generated codes and user-chosen custom slugs.
const REFERRAL_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{2,30}[a-z0-9]$/;

// A few reserved slugs that would collide with routes or look like official codes.
const RESERVED_SLUGS = new Set([
	"admin",
	"api",
	"app",
	"auth",
	"dashboard",
	"login",
	"register",
	"referral",
	"referrals",
	"support",
	"help",
]);

/** Normalize raw user input into the canonical slug form (trimmed, lowercase). */
export function normalizeReferralSlug(raw: string): string {
	return raw.trim().toLowerCase();
}

/** Whether a normalized slug is a valid, non-reserved referral code. */
export function isValidReferralSlug(slug: string): boolean {
	return REFERRAL_SLUG_REGEX.test(slug) && !RESERVED_SLUGS.has(slug);
}

/** Build the public referral link for a code given an app origin. */
export function buildReferralLink(origin: string, code: string): string {
	return `${origin.replace(/\/$/, "")}/r/${code}`;
}
