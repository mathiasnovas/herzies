#!/usr/bin/env bash
set -euo pipefail

# Build, sign, and notarize the macOS app.
# Reads APPLE_* env vars from packages/desktop/.env.local.

cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "error: .env.local not found in $(pwd)" >&2
  echo "       run: cp .env.example .env.local  and fill in the values" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

required=(APPLE_SIGNING_IDENTITY APPLE_ID APPLE_PASSWORD APPLE_TEAM_ID)
for var in "${required[@]}"; do
  if [ -z "${!var:-}" ] || [[ "${!var}" == *"REPLACE_"* ]] || [[ "${!var}" == *"xxxx-xxxx"* ]]; then
    echo "error: $var is unset or still a placeholder in .env.local" >&2
    exit 1
  fi
done

echo "==> Building with identity: $APPLE_SIGNING_IDENTITY"
pnpm tauri build "$@"
