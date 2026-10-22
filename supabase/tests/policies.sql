-- Security assertions for the database. Run by `bun run db:check` in the gate
-- and, read-only, against production straight after the launch migration.
-- Each block raises (and psql exits non-zero) if a rule is broken.

do $$
declare
  bad text;
begin
  -- 1. Row-level security is on for every table in public.
  select string_agg(c.relname, ', ') into bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if bad is not null then raise exception 'RLS disabled on: %', bad; end if;

  -- 2. Admin access always goes through is_admin() (role plus two-factor).
  select string_agg(schemaname || '.' || tablename || ' "' || policyname || '"', ', ') into bad
  from pg_policies
  where schemaname in ('public', 'storage')
    and (coalesce(qual, '') like '%has_role(%' or coalesce(with_check, '') like '%has_role(%');
  if bad is not null then raise exception 'Policies calling has_role directly: %', bad; end if;

  -- 3. Visitors cannot write to any table directly.
  select string_agg(distinct table_name, ', ') into bad
  from information_schema.role_table_grants
  where grantee = 'anon' and table_schema = 'public'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if bad is not null then raise exception 'anon can write to: %', bad; end if;

  -- 4. A signed-in session without two-factor is refused everywhere but user_roles.
  select string_agg(c.relname, ', ') into bad
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'user_roles'
    and not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
        and p.policyname = 'require aal2' and p.permissive = 'RESTRICTIVE'
    );
  if bad is not null then raise exception 'Missing restrictive aal2 policy on: %', bad; end if;

  -- 5. Server-only tables are invisible to client roles.
  select string_agg(distinct table_name || ' (' || grantee || ')', ', ') into bad
  from information_schema.role_table_grants
  where grantee in ('anon', 'authenticated') and table_schema = 'public'
    and table_name in ('integration_secrets', 'rate_limits', 'stripe_events');
  if bad is not null then raise exception 'Client roles can reach server-only tables: %', bad; end if;

  -- 6. Visitors cannot list storage objects in the site buckets.
  select string_agg(policyname, ', ') into bad
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and cmd in ('SELECT', 'ALL')
    and ('public' = any (roles) or 'anon' = any (roles))
    and coalesce(qual, '') ~ '(media|audio|downloads)';
  if bad is not null then raise exception 'Public list policies on storage: %', bad; end if;

  -- 7. Approved Greek always names the person who approved it.
  if exists (
    select 1 from public.content_translations
    where status = 'approved' and approved_by is null and origin <> 'fixture'
  ) then
    raise exception 'Approved translations without a reviewer';
  end if;
end;
$$;

select 'database policies ok' as result;
