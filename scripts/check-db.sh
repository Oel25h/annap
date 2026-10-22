#!/usr/bin/env bash
# Database security and publishing checks against the local Supabase stack.
# The publishing checks run in a transaction that is rolled back.
set -euo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
for f in supabase/tests/policies.sql supabase/tests/publishing.sql; do
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -At -f "$f"
done
