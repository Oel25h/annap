-- A chapter not free to stream must keep its file in the private downloads
-- bucket (a public bucket serves any guessed path); free chapters stream
-- from the public audio bucket. With the file private and its media row hidden
-- from the public ('public read' on media_assets skips the downloads bucket),
-- the track's media id exposes nothing.
--
-- Whatever toggles free_to_stream (the studio) must move the file between the
-- two buckets: this guard refuses the mismatch.
create or replace function public.audiobook_track_bucket_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare b text;
begin
  if new.audio_media_id is null then return new; end if;
  select m.bucket into b from public.media_assets m where m.id = new.audio_media_id;
  if new.free_to_stream and b is distinct from 'audio' then
    raise exception 'A chapter free to stream needs its file in the audio bucket (found %).', coalesce(b, 'none');
  end if;
  if not new.free_to_stream and b is distinct from 'downloads' then
    raise exception 'A chapter not free to stream needs its file in the private downloads bucket (found %).', coalesce(b, 'none');
  end if;
  return new;
end; $$;

drop trigger if exists audiobook_track_bucket_guard on public.audiobook_tracks;
create trigger audiobook_track_bucket_guard
  before insert or update of audio_media_id, free_to_stream on public.audiobook_tracks
  for each row execute function public.audiobook_track_bucket_guard();
revoke all on function public.audiobook_track_bucket_guard() from public, anon;
