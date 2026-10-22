-- Redo, part 0: a translator role for the Greek reviewer.
-- In its own file because a new enum value cannot be used in the transaction
-- that adds it. Rollback: none needed (an unused enum value is harmless).
alter type public.app_role add value if not exists 'translator';
