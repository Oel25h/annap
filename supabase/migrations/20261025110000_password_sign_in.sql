-- Password sign-in is enough for the studio. The admin and translator roles,
-- and a live session, still apply. Two-factor is no longer required.
-- Rollback: restore the aal2 checks from 20261022180100 and the
-- "require aal2" policies from 20261022180400.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
     and public.session_is_active()
$$;

create or replace function public.is_translator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (public.has_role(auth.uid(), 'translator') or public.has_role(auth.uid(), 'admin'))
     and public.session_is_active()
$$;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename
    from pg_policies
    where policyname = 'require aal2'
      and schemaname in ('public', 'storage')
  loop
    execute format('drop policy %I on %I.%I', 'require aal2', p.schemaname, p.tablename);
  end loop;
end;
$$;
