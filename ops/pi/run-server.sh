#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${MM_ROOT_DIR:-$HOME/magicmirror_vps}"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ -s "$NVM_DIR/nvm.sh" ]; then
	. "$NVM_DIR/nvm.sh"
fi

cd "$ROOT_DIR"
export MM_CONFIG_FILE="${MM_CONFIG_FILE:-config/config.vps.js}"

if command -v nvm >/dev/null 2>&1; then
	nvm use >/dev/null 2>&1 || true
fi

exec npm run server
