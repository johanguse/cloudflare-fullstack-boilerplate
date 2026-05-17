#!/usr/bin/env bash
# dev-all-wsl.sh — Start all dev services concurrently (WSL / Linux)
# Usage: bun dev:all:wsl
#
# `bun dev` (Vite + @cloudflare/vite-plugin) runs both the React client (HMR)
# and the Cloudflare Worker inline at http://localhost:5173.
# No separate wrangler process is needed.

set -euo pipefail

# Load secrets from .dev.vars
if [ -f .dev.vars ]; then
  set -a
  # shellcheck disable=SC1091
  source .dev.vars
  set +a
fi

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting all dev services...${NC}"
echo ""

cleanup() {
  echo -e "\n${YELLOW}Stopping all services...${NC}"
  kill 0
}
trap cleanup EXIT INT TERM

# 1. Vite dev server (client HMR + worker via @cloudflare/vite-plugin)
echo -e "${BLUE}[1/2]${NC} Starting Vite + Worker (localhost:5173)..."
bun dev &
VITE_PID=$!

# 2. Trigger.dev dev server (background jobs)
if [ -n "${TRIGGER_API_KEY:-}" ]; then
  echo -e "${BLUE}[2/2]${NC} Starting Trigger.dev dev server..."
  bun trigger:dev &
  TRIGGER_PID=$!
else
  echo -e "${YELLOW}[2/2]${NC} Skipping Trigger.dev (TRIGGER_API_KEY not set in .dev.vars)"
fi

echo ""
echo -e "${GREEN}All services started!${NC}"
echo -e "  ${CYAN}App:${NC}       http://localhost:5173"
echo -e "  ${CYAN}Health:${NC}    http://localhost:5173/api/v1/health"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

wait
