#!/usr/bin/env bash
# Writes .env for the local Supabase stack (CI and fresh machines).
# Prints nothing secret; the values are the stack's local development keys.
set -euo pipefail
SUPABASE="${SUPABASE_CLI:-supabase}"
eval "$($SUPABASE status -o env | sed 's/^/export SB_/')"
cat > .env <<ENV
SUPABASE_URL="${SB_API_URL}"
SUPABASE_PUBLISHABLE_KEY="${SB_PUBLISHABLE_KEY:-$SB_ANON_KEY}"
SUPABASE_ANON_KEY="${SB_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SB_SERVICE_ROLE_KEY}"
SITE_URL="http://localhost:3000"
ADMIN_SETUP_SECRET="local-dev-setup-secret"
APP_ENCRYPTION_KEY="$(openssl rand -base64 32)"
ENV
echo "wrote .env for ${SB_API_URL}"
