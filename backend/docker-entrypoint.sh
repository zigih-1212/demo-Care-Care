#!/usr/bin/env bash
set -euo pipefail

# Container entrypoint: wait for the database, run migrations, then hand off to
# the CMD. Migrations at boot are acceptable here because the deploy is
# single-writer via a Kubernetes Job in production; this fallback keeps local
# `docker compose up` self-sufficient.

echo "Waiting for database…"
python - <<'PY'
import os, time, sys
import psycopg

dsn = os.environ.get("DATABASE_URL", "")
if not dsn:
    print("DATABASE_URL not set; skipping DB wait")
    sys.exit(0)

for attempt in range(30):
    try:
        with psycopg.connect(dsn, connect_timeout=3):
            print("Database is up")
            break
    except Exception as exc:  # noqa: BLE001 - we only log and retry
        print(f"  attempt {attempt + 1}/30: {exc}")
        time.sleep(2)
else:
    print("Database not reachable after retries", file=sys.stderr)
    sys.exit(1)
PY

python manage.py migrate --noinput

exec "$@"
