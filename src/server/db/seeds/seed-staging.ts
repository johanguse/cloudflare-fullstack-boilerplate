/**
 * Seeds staging with operator-supplied passwords and rotates existing seed
 * credentials. STAGING_SEED_PASSWORDS is a JSON object keyed by seed email.
 * See docs/security-audit/AUTH-REMEDIATION.md. Never prints passwords.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashPassword } from "better-auth/crypto";
import { $ } from "bun";
import {
	parseStagingSeedPasswords,
	STAGING_SEED_EMAILS,
} from "./staging-credentials";

const passwords = parseStagingSeedPasswords(process.env.STAGING_SEED_PASSWORDS);
const hashes = await Promise.all(
	STAGING_SEED_EMAILS.map((email) => hashPassword(passwords[email])),
);

const SQL = `
-- Users
INSERT OR IGNORE INTO user (id, name, email, email_verified, role, created_at, updated_at)
VALUES
  ('seed-user-admin-0000-0000-000000000001', 'Admin User',    'admin@example.com',    1, 'admin', strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-basic-0000-0000-000000000002', 'Regular User',  'user@example.com',     1, 'user',  strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-pro-00-0000-0000-000000000003', 'Pro User',     'pro@example.com',      1, 'user',  strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-biz-0-0000-0000-000000000004', 'Business User', 'business@example.com', 1, 'user',  strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-agc-0-0000-0000-000000000005', 'Agency User',   'agency@example.com',   1, 'user',  strftime('%s', 'now'), strftime('%s', 'now'));

-- Accounts (email/password credentials)
INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES
  (
    'seed-acct-admin-0000-0000-000000000001', 'seed-user-admin-0000-0000-000000000001', 'credential',
    'seed-user-admin-0000-0000-000000000001',
    '${hashes[0]}',
    strftime('%s', 'now'), strftime('%s', 'now')
  ),
  (
    'seed-acct-basic-0000-0000-000000000002', 'seed-user-basic-0000-0000-000000000002', 'credential',
    'seed-user-basic-0000-0000-000000000002',
    '${hashes[1]}',
    strftime('%s', 'now'), strftime('%s', 'now')
  ),
  (
    'seed-acct-pro-000-0000-0000-000000000003', 'seed-user-pro-00-0000-0000-000000000003', 'credential',
    'seed-user-pro-00-0000-0000-000000000003',
    '${hashes[2]}',
    strftime('%s', 'now'), strftime('%s', 'now')
  ),
  (
    'seed-acct-biz-0-0000-0000-000000000004', 'seed-user-biz-0-0000-0000-000000000004', 'credential',
    'seed-user-biz-0-0000-0000-000000000004',
    '${hashes[3]}',
    strftime('%s', 'now'), strftime('%s', 'now')
  ),
  (
    'seed-acct-agc-0-0000-0000-000000000005', 'seed-user-agc-0-0000-0000-000000000005', 'credential',
    'seed-user-agc-0-0000-0000-000000000005',
    '${hashes[4]}',
    strftime('%s', 'now'), strftime('%s', 'now')
  );

-- Rotate only the known seed accounts, and revoke their D1 sessions.
UPDATE account SET account_id = user_id, password = '${hashes[0]}', updated_at = strftime('%s', 'now') WHERE provider_id = 'credential' AND user_id = 'seed-user-admin-0000-0000-000000000001';
UPDATE account SET account_id = user_id, password = '${hashes[1]}', updated_at = strftime('%s', 'now') WHERE provider_id = 'credential' AND user_id = 'seed-user-basic-0000-0000-000000000002';
UPDATE account SET account_id = user_id, password = '${hashes[2]}', updated_at = strftime('%s', 'now') WHERE provider_id = 'credential' AND user_id = 'seed-user-pro-00-0000-0000-000000000003';
UPDATE account SET account_id = user_id, password = '${hashes[3]}', updated_at = strftime('%s', 'now') WHERE provider_id = 'credential' AND user_id = 'seed-user-biz-0-0000-0000-000000000004';
UPDATE account SET account_id = user_id, password = '${hashes[4]}', updated_at = strftime('%s', 'now') WHERE provider_id = 'credential' AND user_id = 'seed-user-agc-0-0000-0000-000000000005';
DELETE FROM session WHERE user_id IN ('seed-user-admin-0000-0000-000000000001', 'seed-user-basic-0000-0000-000000000002', 'seed-user-pro-00-0000-0000-000000000003', 'seed-user-biz-0-0000-0000-000000000004', 'seed-user-agc-0-0000-0000-000000000005');

-- Subscriptions
INSERT OR IGNORE INTO subscriptions (id, user_id, stripe_customer_id, plan, status, credit_balance, created_at, updated_at)
VALUES
  ('seed-sub-admin-00000-0000-000000000001', 'seed-user-admin-0000-0000-000000000001', 'cus_staging_seed_admin', 'professional', 'active',  600, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-basic-00000-0000-000000000002', 'seed-user-basic-0000-0000-000000000002', 'cus_staging_seed_user',  'free',         'active',   50, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-pro-000-0000-0000-000000000003', 'seed-user-pro-00-0000-0000-000000000003', 'cus_staging_seed_pro', 'starter',      'active',  200, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-biz-0-0000-0000-000000000004', 'seed-user-biz-0-0000-0000-000000000004', 'cus_staging_seed_biz',   'business',     'active', 1500, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-agc-0-0000-0000-000000000005', 'seed-user-agc-0-0000-0000-000000000005', 'cus_staging_seed_agc',   'agency',       'active', 4000, strftime('%s', 'now'), strftime('%s', 'now'));

-- Notification settings
INSERT OR IGNORE INTO user_notification_settings
  (user_id, notify_payment_receipt, notify_invoice, notify_nfse_issued, notify_low_balance, notify_subscription_changed, created_at, updated_at)
VALUES
  ('seed-user-admin-0000-0000-000000000001', 1, 1, 1, 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-basic-0000-0000-000000000002', 1, 1, 1, 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-pro-00-0000-0000-000000000003', 1, 1, 0, 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-biz-0-0000-0000-000000000004', 1, 1, 1, 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-agc-0-0000-0000-000000000005', 1, 1, 1, 1, 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- API keys (prefix/hash only; secrets are never stored)
INSERT OR IGNORE INTO api_keys
  (id, user_id, name, key_prefix, key_hash, created_at, last_used_at)
VALUES
  ('seed-key-admin-prod-0000000000001', 'seed-user-admin-0000-0000-000000000001', 'Production Backend', 'cfbp_live_admin_', '1111111111111111111111111111111111111111111111111111111111111111', strftime('%s', 'now', '-9 days'), strftime('%s', 'now', '-2 hours')),
  ('seed-key-admin-ci-00000000000002', 'seed-user-admin-0000-0000-000000000001', 'CI Deployments',      'cfbp_live_ci_000', '2222222222222222222222222222222222222222222222222222222222222222', strftime('%s', 'now', '-6 days'), strftime('%s', 'now', '-1 day')),
  ('seed-key-user-web-00000000000003', 'seed-user-basic-0000-0000-000000000002', 'Website Widget',      'cfbp_live_web_00', '3333333333333333333333333333333333333333333333333333333333333333', strftime('%s', 'now', '-5 days'), NULL),
  ('seed-key-pro-sync-00000000000004', 'seed-user-pro-00-0000-0000-000000000003', 'Content Sync',       'cfbp_live_sync_0', '4444444444444444444444444444444444444444444444444444444444444444', strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-6 hours')),
  ('seed-key-biz-api-00000000000005', 'seed-user-biz-0-0000-0000-000000000004', 'Business API',         'cfbp_live_biz_00', '5555555555555555555555555555555555555555555555555555555555555555', strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-30 minutes'));

-- Credit packages
INSERT OR IGNORE INTO credit_packages (id, name, credits, price_in_cents, is_active, display_order, created_at)
VALUES
  ('pkg-100',  '100 Credits',  100,   990, 1, 1, strftime('%s', 'now')),
  ('pkg-500',  '500 Credits',  500,  3990, 1, 2, strftime('%s', 'now')),
  ('pkg-1000', '1000 Credits', 1000, 6990, 1, 3, strftime('%s', 'now'));
`;

const scratchDir = await mkdtemp(join(tmpdir(), "seed-staging-"));
const tmpFile = join(scratchDir, "seed.sql");
try {
	await writeFile(tmpFile, SQL, { mode: 0o600 });
	console.log("Seeding staging database and rotating seed credentials...");
	await $`wrangler d1 execute DB --env staging --remote --file=${tmpFile}`;
	console.log(
		"Staging database seeded. Seed passwords updated and D1 sessions revoked.",
	);
} finally {
	await rm(scratchDir, { recursive: true, force: true });
}
