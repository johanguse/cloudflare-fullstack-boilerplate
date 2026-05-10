#!/usr/bin/env bash
# scripts/setup.sh — Provision Cloudflare resources and print next steps (CF-166)
# Requires: `wrangler login` and repo root as cwd.
set -euo pipefail

echo "== Cloudflare SaaS Boilerplate — setup helper =="
echo ""

create_if_needed() {
	local cmd="$1"
	local name="$2"
	if ! eval "$cmd" 2>/dev/null; then
		echo "    (skipped or already exists: $name)"
	fi
}

echo "1) D1 databases (copy database_id into wrangler.jsonc)"
create_if_needed "wrangler d1 create cf-boilerplate-db" "cf-boilerplate-db"
create_if_needed "wrangler d1 create cf-boilerplate-staging" "cf-boilerplate-staging"

echo ""
echo "2) KV namespaces"
create_if_needed "wrangler kv namespace create SESSION_KV" "SESSION_KV"
create_if_needed "wrangler kv namespace create CACHE_KV" "CACHE_KV"
create_if_needed "wrangler kv namespace create SESSION_KV_STAGING" "SESSION_KV_STAGING"
create_if_needed "wrangler kv namespace create CACHE_KV_STAGING" "CACHE_KV_STAGING"

echo ""
echo "3) R2 buckets"
create_if_needed "wrangler r2 bucket create cf-boilerplate-storage" "storage-prod"
create_if_needed "wrangler r2 bucket create cf-boilerplate-storage-staging" "storage-staging"

echo ""
echo "4) Email sending (per domain)"
echo "    wrangler email sending enable yourdomain.com"
echo "    See docs/EMAIL_SETUP.md"

echo ""
echo "5) Local database"
echo "    bun db:migrate"
echo "    bun db:seed:local   # optional"

echo ""
echo "6) Secrets"
echo "    cp .dev.vars.example .dev.vars  # local"
echo "    bash scripts/upload-secrets.sh staging"

echo ""
echo "7) Typegen after editing wrangler.jsonc"
echo "    bun run cf:typegen"
