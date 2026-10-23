-- The hourly YouTube sync. A video that YouTube no longer returns (deleted or
-- made private) is hidden, never deleted, and gone_at records when the sync
-- hid it, so the sync shows it again if it comes back without touching the
-- videos the owner hid herself. last_result keeps the outcome of the latest
-- sync for the studio's keys screen.
alter table public.videos add column if not exists gone_at timestamptz;
alter table public.integration_secrets add column if not exists last_result jsonb;
