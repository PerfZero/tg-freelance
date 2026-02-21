#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/tg-freelance}"
BACKEND_SERVICE="${BACKEND_SERVICE:-tg-freelance-backend}"

cd "$REPO_DIR/backend"
rm -rf node_modules
npm ci
npm run prisma:generate
npm run prisma:deploy
npm run build

systemctl restart "$BACKEND_SERVICE"
systemctl is-active "$BACKEND_SERVICE"
