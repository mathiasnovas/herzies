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

# Tauri updater signing — optional locally. Without these, the build still
# produces a DMG but skips the .app.tar.gz updater artifact + .sig file.
if [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
  echo "warn: TAURI_SIGNING_PRIVATE_KEY is unset; updater artifacts will NOT be produced." >&2
  echo "      Add the key to .env.local to enable signed updater bundles." >&2
fi

echo "==> Ensuring both macOS Rust targets are installed"
rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null

echo "==> Building universal binary with identity: $APPLE_SIGNING_IDENTITY"
pnpm tauri build --target universal-apple-darwin "$@"
