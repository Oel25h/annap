#!/bin/bash
# Creates (or resets) a LOCAL-ONLY studio admin for e2e/studio.spec.ts.
# Runs against the local Supabase stack only. Never use against production.
#   email:    studio-test@example.test
#   password: local-studio-test-1
set -euo pipefail
DB=${STUDIO_TEST_DB:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}
case "$DB" in
  *@127.0.0.1:*|*@localhost:*) ;;
  *) echo "Refusing: this script only runs against the local Supabase stack." >&2; exit 1 ;;
esac
psql -v ON_ERROR_STOP=1 -q "$DB" <<'SQL'
do $$
declare uid uuid := '5717d10a-0000-4000-8000-00000000a0a1';
begin
  delete from auth.mfa_factors where user_id = uid;
  delete from auth.identities where user_id = uid;
  delete from public.user_roles where user_id = uid;
  delete from auth.users where id = uid;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change, phone_change_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    'studio-test@example.test', extensions.crypt('local-studio-test-1', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', 'studio-test@example.test', 'email_verified', true),
    'email', now(), now(), now());
  insert into public.user_roles (user_id, role) values (uid, 'admin');
end $$;
SQL
echo "local test admin ready: studio-test@example.test"
