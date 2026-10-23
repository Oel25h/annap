-- Sending letters from the studio. A letter goes out only after a test to
-- the admin of exactly what will be sent: test_hash fingerprints the subject,
-- body and header image at the test, and the send refuses if they changed.
alter table public.newsletters add column if not exists test_sent_at timestamptz;
alter table public.newsletters add column if not exists test_hash text;
