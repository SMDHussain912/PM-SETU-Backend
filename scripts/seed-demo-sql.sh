#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo "Refusing to load demo fixtures in production." >&2
  exit 1
fi

# The project DATABASE_URL is a Prisma URL and may contain Prisma-only
# parameters such as ?schema=public, which libpq/psql rejects. The demo
# fixtures are managed by Prisma, so do not pass that URL to psql.
echo "Loading PM SETU development fixtures through Prisma…"
npm run db:seed:demo
