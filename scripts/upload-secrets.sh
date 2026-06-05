#!/usr/bin/env bash
# upload-secrets.sh — Upload secrets from .env to Wrangler using the bulk secrets API
# Usage: bash scripts/upload-secrets.sh [staging|production]
#
# Reads UPPER_SNAKE_CASE keys from .env and uploads them in a single bulk request
# via `wrangler secret bulk`. Requires jq.

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

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install with: brew install jq / apt install jq"
  exit 1
fi

WRANGLER_ENV_FLAG=""
if [ "$ENV" = "staging" ]; then
  WRANGLER_ENV_FLAG="--env staging"
fi

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

echo "Building secrets payload for [$ENV]..."

payload="{}"
uploaded=0
skipped=0

for secret in "${SECRETS[@]}"; do
  value=$(grep -E "^${secret}=" "$ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  if [ -z "$value" ]; then
    echo "  SKIP   $secret (empty)"
    ((skipped++)) || true
    continue
  fi
  echo "  ADD    $secret"
  payload=$(jq --arg k "$secret" --arg v "$value" '. + {($k): $v}' <<<"$payload")
  ((uploaded++)) || true
done

if [ "$uploaded" -eq 0 ]; then
  echo ""
  echo "No secrets to upload."
  exit 0
fi

echo ""
echo "Uploading $uploaded secret(s) in a single bulk request to [$ENV]..."
# shellcheck disable=SC2086
echo "$payload" | wrangler secret bulk $WRANGLER_ENV_FLAG

echo ""
echo "Done! Uploaded $uploaded secret(s), skipped $skipped."
