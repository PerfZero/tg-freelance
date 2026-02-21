#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/tg-freelance}"
WEB_ROOT="${WEB_ROOT:-/var/www/tg-freelance}"

cd "$REPO_DIR/frontend"
npm ci
npm run build

mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*
cp -r dist/. "$WEB_ROOT"/

nginx -t
systemctl reload nginx
