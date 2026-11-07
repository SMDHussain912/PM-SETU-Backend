#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo "Refusing to load demo fixtures in production." >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set; configure it in .env first." >&2
  exit 1
fi

command -v psql >/dev/null 2>&1 || {
  echo "psql is required for this SQL entry point." >&2
  exit 1
}

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/dev/seed_demo.sql
