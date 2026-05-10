#!/usr/bin/env bash
# upload-secrets.sh — Upload secrets from .env to Wrangler
# Usage: bash scripts/upload-secrets.sh [staging|production]
#
# Reads UPPER_SNAKE_CASE keys from .env and uploads them via `wrangler secret put`.
# Skips blank values and comment lines.

set -euo pipefail

ENV="${1:-staging}"

if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
  echo "Usage: $0 [staging|production]"
  exit 1
fi

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Copy .dev.vars.example → .env and fill in values."
  exit 1
fi

WRANGLER_ENV_FLAG=""
if [ "$ENV" = "staging" ]; then
  WRANGLER_ENV_FLAG="--env staging"
fi

echo "Uploading secrets to Wrangler [$ENV]..."
echo ""

# List of secrets to upload (all UPPER_SNAKE_CASE vars from .env)
SECRETS=(
  BETTER_AUTH_SECRET
  BETTER_AUTH_GOOGLE_CLIENT_ID
  BETTER_AUTH_GOOGLE_CLIENT_SECRET
  BETTER_AUTH_GITHUB_CLIENT_ID
  BETTER_AUTH_GITHUB_CLIENT_SECRET
  STRIPE_API_KEY
  STRIPE_WEBHOOK_SECRET
  FISCAL_NACIONAL_API_KEY
  TRIGGER_API_KEY
  INTERNAL_API_KEY
  SENTRY_DSN
)

uploaded=0
skipped=0

for secret in "${SECRETS[@]}"; do
  value=$(grep -E "^${secret}=" "$ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  if [ -z "$value" ]; then
    echo "  SKIP   $secret (empty)"
    ((skipped++)) || true
    continue
  fi
  echo "  PUT    $secret"
  # shellcheck disable=SC2086
  echo "$value" | wrangler secret put "$secret" $WRANGLER_ENV_FLAG
  ((uploaded++)) || true
done

echo ""
echo "Done! Uploaded $uploaded secret(s), skipped $skipped."
