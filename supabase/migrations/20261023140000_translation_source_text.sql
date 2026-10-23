-- The English a translation was checked against, kept beside its hash, so the
-- studio can show what changed when the Greek goes stale ("Was" and "Now").
-- Set when a translation is first seen at publish and when someone keeps the
-- Greek as it is. Nothing public reads it.
-- Rollback: alter table public.content_translations drop column source_fields;
alter table public.content_translations add column if not exists source_fields jsonb
  check (source_fields is null or jsonb_typeof(source_fields) = 'object');
