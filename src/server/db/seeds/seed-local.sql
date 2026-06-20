-- Local development seed data
-- Run with: bun db:seed:local
--
-- Passwords hashed with better-auth Scrypt (hashPassword())
--
-- | Email                    | Password       | Role  | Plan         | Credits |
-- |--------------------------|----------------|-------|--------------|---------|
-- | admin@example.com        | Admin1234!     | admin | professional | 600     |
-- | user@example.com         | User1234!      | user  | free         | 50      |
-- | pro@example.com          | Pro1234!       | user  | starter      | 200     |
-- | business@example.com     | Business1234!  | user  | business     | 1500    |
-- | agency@example.com       | Agency1234!    | user  | agency       | 4000    |

-- ─── Users ────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO user (id, name, email, email_verified, role, created_at, updated_at)
VALUES
  ('seed-user-admin-0000-0000-000000000001', 'Admin User',    'admin@example.com',    1, 'admin', strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-basic-0000-0000-000000000002', 'Regular User',  'user@example.com',     1, 'user',  strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-pro-00-0000-0000-000000000003', 'Pro User',     'pro@example.com',      1, 'user',  strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-biz-0-0000-0000-000000000004', 'Business User', 'business@example.com', 1, 'user',  strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-agc-0-0000-0000-000000000005', 'Agency User',   'agency@example.com',   1, 'user',  strftime('%s', 'now'), strftime('%s', 'now'));

-- ─── Accounts (email/password credentials) ────────────────────────────────────
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
  ),
  (
    'seed-acct-pro-000-0000-0000-000000000003',
    'pro@example.com',
    'credential',
    'seed-user-pro-00-0000-0000-000000000003',
    'ac190992d8ce6efef46b16e8be7e3f59:36490f79aed0efbea9fac25de632787877499f43fb236fed764cccf3cd68d5590fc675d6ff8076077a9410042c07af86c0e74c01149313ece6bdc1cc953c4859',
    strftime('%s', 'now'),
    strftime('%s', 'now')
  ),
  (
    'seed-acct-biz-0-0000-0000-000000000004',
    'business@example.com',
    'credential',
    'seed-user-biz-0-0000-0000-000000000004',
    'ac190992d8ce6efef46b16e8be7e3f59:36490f79aed0efbea9fac25de632787877499f43fb236fed764cccf3cd68d5590fc675d6ff8076077a9410042c07af86c0e74c01149313ece6bdc1cc953c4859',
    strftime('%s', 'now'),
    strftime('%s', 'now')
  ),
  (
    'seed-acct-agc-0-0000-0000-000000000005',
    'agency@example.com',
    'credential',
    'seed-user-agc-0-0000-0000-000000000005',
    'ac190992d8ce6efef46b16e8be7e3f59:36490f79aed0efbea9fac25de632787877499f43fb236fed764cccf3cd68d5590fc675d6ff8076077a9410042c07af86c0e74c01149313ece6bdc1cc953c4859',
    strftime('%s', 'now'),
    strftime('%s', 'now')
  );

-- ─── Subscriptions ────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO subscriptions (id, user_id, stripe_customer_id, plan, status, credit_balance, created_at, updated_at)
VALUES
  ('seed-sub-admin-00000-0000-000000000001', 'seed-user-admin-0000-0000-000000000001', 'cus_local_seed_admin', 'professional', 'active',  600, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-basic-00000-0000-000000000002', 'seed-user-basic-0000-0000-000000000002', 'cus_local_seed_user',  'free',         'active',   50, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-pro-000-0000-0000-000000000003', 'seed-user-pro-00-0000-0000-000000000003', 'cus_local_seed_pro', 'starter',      'active',  200, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-biz-0-0000-0000-000000000004', 'seed-user-biz-0-0000-0000-000000000004', 'cus_local_seed_biz',   'business',     'active', 1500, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-sub-agc-0-0000-0000-000000000005', 'seed-user-agc-0-0000-0000-000000000005', 'cus_local_seed_agc',   'agency',       'active', 4000, strftime('%s', 'now'), strftime('%s', 'now'));

-- ─── Notification settings (all defaults — receive everything) ────────────────
INSERT OR IGNORE INTO user_notification_settings
  (user_id, notify_payment_receipt, notify_invoice, notify_nfse_issued, notify_low_balance, notify_subscription_changed, created_at, updated_at)
VALUES
  ('seed-user-admin-0000-0000-000000000001', 1, 1, 1, 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-basic-0000-0000-000000000002', 1, 1, 1, 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-pro-00-0000-0000-000000000003', 1, 1, 0, 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-biz-0-0000-0000-000000000004', 1, 1, 1, 1, 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-user-agc-0-0000-0000-000000000005', 1, 1, 1, 1, 1, strftime('%s', 'now'), strftime('%s', 'now'));

-- ─── API keys (prefix/hash only; secrets are never stored) ────────────────────
INSERT OR IGNORE INTO api_keys
  (id, user_id, name, key_prefix, key_hash, created_at, last_used_at)
VALUES
  ('seed-key-admin-prod-0000000000001', 'seed-user-admin-0000-0000-000000000001', 'Production Backend', 'cfbp_live_admin_', '1111111111111111111111111111111111111111111111111111111111111111', strftime('%s', 'now', '-9 days'), strftime('%s', 'now', '-2 hours')),
  ('seed-key-admin-ci-00000000000002', 'seed-user-admin-0000-0000-000000000001', 'CI Deployments',      'cfbp_live_ci_000', '2222222222222222222222222222222222222222222222222222222222222222', strftime('%s', 'now', '-6 days'), strftime('%s', 'now', '-1 day')),
  ('seed-key-user-web-00000000000003', 'seed-user-basic-0000-0000-000000000002', 'Website Widget',      'cfbp_live_web_00', '3333333333333333333333333333333333333333333333333333333333333333', strftime('%s', 'now', '-5 days'), NULL),
  ('seed-key-pro-sync-00000000000004', 'seed-user-pro-00-0000-0000-000000000003', 'Content Sync',       'cfbp_live_sync_0', '4444444444444444444444444444444444444444444444444444444444444444', strftime('%s', 'now', '-4 days'), strftime('%s', 'now', '-6 hours')),
  ('seed-key-biz-api-00000000000005', 'seed-user-biz-0-0000-0000-000000000004', 'Business API',         'cfbp_live_biz_00', '5555555555555555555555555555555555555555555555555555555555555555', strftime('%s', 'now', '-3 days'), strftime('%s', 'now', '-30 minutes'));

-- ─── Credit packages ──────────────────────────────────────────────────────────
INSERT OR IGNORE INTO credit_packages (id, name, credits, price_in_cents, is_active, display_order, created_at)
VALUES
  ('pkg-100',  '100 Credits',  100,   990, 1, 1, strftime('%s', 'now')),
  ('pkg-500',  '500 Credits',  500,  3990, 1, 2, strftime('%s', 'now')),
  ('pkg-1000', '1000 Credits', 1000, 6990, 1, 3, strftime('%s', 'now'));

-- ─── Sample invoices (paid) ───────────────────────────────────────────────────
INSERT OR IGNORE INTO invoices
  (id, user_id, number, status, currency, amount_subtotal, amount_tax, amount_total, customer_name, customer_email, issued_at, paid_at, created_at, updated_at)
VALUES
  ('seed-inv-001', 'seed-user-admin-0000-0000-000000000001', 'INV-0001', 'paid', 'BRL', 12900, 0, 12900, 'Acme Corp',    'billing@acme.com',  strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-inv-002', 'seed-user-admin-0000-0000-000000000001', 'INV-0002', 'paid', 'BRL',  4990, 0,  4990, 'Widget Co',    'pay@widget.co',     strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now'), strftime('%s', 'now')),
  ('seed-inv-003', 'seed-user-pro-00-0000-0000-000000000003', 'INV-0003', 'issued', 'BRL', 9900, 0, 9900, 'Client Inc',  'invoice@client.com', strftime('%s', 'now'), NULL,                  strftime('%s', 'now'), strftime('%s', 'now'));

INSERT OR IGNORE INTO invoice_items (id, invoice_id, description, quantity, unit_amount, total, created_at)
VALUES
  ('seed-item-001a', 'seed-inv-001', 'Professional Plan — Monthly', 1, 12900, 12900, strftime('%s', 'now')),
  ('seed-item-002a', 'seed-inv-002', 'Starter Plan — Monthly',      1,  4990,  4990, strftime('%s', 'now')),
  ('seed-item-003a', 'seed-inv-003', 'Starter Plan — Monthly',      1,  9900,  9900, strftime('%s', 'now'));
