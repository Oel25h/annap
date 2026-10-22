-- Bought ebooks and audiobooks: their files are book_files with purpose
-- 'purchase', handed out as download links once an order is paid.
alter table public.book_files drop constraint if exists book_files_purpose_check;
alter table public.book_files
  add constraint book_files_purpose_check
  check (purpose in ('free_download', 'sample', 'purchase'));

create index if not exists download_tokens_order_item_idx
  on public.download_tokens (order_item_id)
  where order_item_id is not null;

create index if not exists orders_payment_intent_idx
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists donations_payment_intent_idx
  on public.donations (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- A note to the shop's inbox when an order needs posting.
alter table public.email_templates drop constraint if exists email_templates_key_check;
alter table public.email_templates
  add constraint email_templates_key_check
  check (key in (
    'newsletter_confirm', 'ebook_link', 'order_receipt', 'donation_thanks', 'contact_autoreply',
    'contact_notification', 'waitlist_confirm', 'order_notification'
  ));
insert into public.email_templates (key, subject, body) values
  ('order_notification', 'New order {orderNumber} to post', '{name} ({email}) placed order {orderNumber}. It includes something to post.')
on conflict (key) do nothing;
