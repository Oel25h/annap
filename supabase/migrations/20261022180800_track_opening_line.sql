-- The open-book player sets each chapter's first sentence beside her voice.
-- Written in the recording's own language, so it needs no translation row.
alter table public.audiobook_tracks
  add column if not exists opening_line text not null default ''
  check (char_length(opening_line) <= 400);

comment on column public.audiobook_tracks.opening_line is
  'The chapter''s first sentence, shown large on the player while it plays. In the recording''s language.';
