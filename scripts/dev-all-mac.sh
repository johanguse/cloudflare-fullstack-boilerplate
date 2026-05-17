#!/usr/bin/env bash
# dev-all-mac.sh — Start all dev services in separate Terminal tabs (macOS)
# Usage: bun dev:all:mac
#
# `bun dev` (Vite + @cloudflare/vite-plugin) runs both the React client (HMR)
# and the Cloudflare Worker inline at http://localhost:5173.

set -euo pipefail

ROOT="$(pwd)"

open_tab() {
  osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT' && $1\""
}

open_tab "bun dev"

if [ -f .dev.vars ] && grep -q "TRIGGER_API_KEY" .dev.vars; then
  open_tab "bun trigger:dev"
fi

echo "Opened dev services in Terminal tabs."
echo "  App:    http://localhost:5173"
echo "  Health: http://localhost:5173/api/v1/health"
