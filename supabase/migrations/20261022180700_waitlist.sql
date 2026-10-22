-- Masterclass waitlists are leads (source 'masterclass:<slug>') with their
-- own consent wording.
alter table public.consent_texts drop constraint if exists consent_texts_key_check;
alter table public.consent_texts
  add constraint consent_texts_key_check
  check (key in ('newsletter', 'ebook_gate', 'contact', 'checkout', 'donation', 'waitlist'));

insert into public.consent_texts (key, version, body)
values (
  'waitlist',
  1,
  'We use your first name and email only to tell you when places open in this masterclass, and keep them for 12 months.'
)
on conflict (key, version) do nothing;
