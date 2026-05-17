/**
 * Staging database seed
 *
 * Inserts test accounts into the staging D1 database via `wrangler d1 execute`.
 * Requires: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in .env
 *
 * Usage: bun db:seed:staging
 *
 * Seed accounts:
 *   admin@example.com  / Admin1234!  — Professional plan, 600 credits
 *   user@example.com   / User1234!   — Free plan, 50 credits
 */

import { $ } from "bun";

// Passwords hashed with better-auth/crypto hashPassword() (Scrypt)
const SQL = `
-- Users
INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES
  ('seed-user-admin-0000-0000-000000000001', 'Admin User',   'admin@example.com', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-basic-0000-0000-000000000002', 'Regular User', 'user@example.com',  1, strftime('%s', 'now'), strftime('%s', 'now'));

-- Accounts (email/password credentials)
INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES
  (
    'seed-acct-admin-0000-0000-000000000001',
    'admin@example.com',
    'credential',
    'seed-user-admin-0000-0000-000000000001',
    '94fc589cf13dd6b1bbb53e2e6f9044f2:e373f4ed796503aed8a605c997cfe968dbf769b72adc316089980e5002a1b4953fb1b699b37ad9c82a81b6ff17b213d7e32f90bdfab9e4089a5eb0d80edbead0',
    strftime('%s', 'now'),
    strftime('%s', 'now')
  ),
  (
    'seed-acct-basic-0000-0000-000000000002',
    'user@example.com',
    'credential',
    'seed-user-basic-0000-0000-000000000002',
    'ac190992d8ce6efef46b16e8be7e3f59:36490f79aed0efbea9fac25de632787877499f43fb236fed764cccf3cd68d5590fc675d6ff8076077a9410042c07af86c0e74c01149313ece6bdc1cc953c4859',
    strftime('%s', 'now'),
    strftime('%s', 'now')
  );

-- Subscriptions
INSERT OR IGNORE INTO subscriptions (id, user_id, stripe_customer_id, plan, status, credit_balance, created_at, updated_at)
VALUES
  ('seed-sub-admin-00000-0000-000000000001', 'seed-user-admin-0000-0000-000000000001', 'cus_staging_seed_admin', 'professional', 'active', 600, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-basic-00000-0000-000000000002', 'seed-user-basic-0000-0000-000000000002', 'cus_staging_seed_user',  'free',         'active',  50, strftime('%s', 'now'), strftime('%s', 'now'));
`;

const tmpFile = `/tmp/seed-staging-${Date.now()}.sql`;

await Bun.write(tmpFile, SQL);

console.log("Seeding staging database...");

try {
	await $`wrangler d1 execute DB --env staging --remote --file=${tmpFile}`;
	console.log("Staging database seeded successfully.");
	console.log("");
	console.log("Seed accounts:");
	console.log("  admin@example.com  /  Admin1234!  (Professional, 600 credits)");
	console.log("  user@example.com   /  User1234!   (Free, 50 credits)");
} finally {
	await $`rm -f ${tmpFile}`;
}
