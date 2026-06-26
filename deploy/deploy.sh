#!/usr/bin/env bash
# Pull latest main, rebuild the image, and (re)start the container.
# Run from anywhere inside the repo: ./deploy/deploy.sh
set -euo pipefail

# repo root = parent of this script's directory
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -f .env ]; then
  echo "ERROR: .env not found." >&2
  echo "  cp .env.example .env   # then fill in NOTION_TOKEN + a parent id" >&2
  exit 1
fi

echo "==> git pull --ff-only"
git pull --ff-only

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> waiting for the app to answer on 127.0.0.1:3001 ..."
for i in $(seq 1 30); do
  # Any HTTP status (even 401 from the Notion health check) means it's up.
  if curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/publish | grep -qE '^[0-9]{3}$'; then
    echo "    up."
    break
  fi
  sleep 1
done

echo "==> container status"
docker compose ps
echo "==> done — https://reverseengineering.agencyadvanta.com"
