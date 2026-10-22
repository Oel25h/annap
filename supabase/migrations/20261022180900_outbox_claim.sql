-- The outbox sender claims a batch of due emails in one statement, so two
-- runs of the cron can never send the same email. An email left "sending"
-- by a run that died is claimable again after 15 minutes.
create or replace function public.claim_outbox(p_limit integer default 40)
returns setof public.email_outbox
language sql
security definer
set search_path = public
as $$
  update public.email_outbox o
  set status = 'sending', updated_at = now()
  where o.id in (
    select id from public.email_outbox
    where (status = 'queued' and send_after <= now())
       or (status = 'sending' and updated_at < now() - interval '15 minutes')
    order by send_after
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  returning o.*;
$$;

revoke all on function public.claim_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_outbox(integer) to service_role;

create index if not exists email_outbox_sending_idx on public.email_outbox (updated_at)
  where status = 'sending';
