-- Reset local development database
-- Drops all application data while preserving schema (tables remain)
-- Run with: bun db:reset
--
-- WARNING: Destructive — use only in local dev.

DELETE FROM api_keys;
DELETE FROM user_notification_settings;
DELETE FROM company_settings;
DELETE FROM nfse_records;
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM credit_transactions;
DELETE FROM credit_packages;
DELETE FROM subscriptions;
DELETE FROM verification;
DELETE FROM session;
DELETE FROM account;
DELETE FROM user;
