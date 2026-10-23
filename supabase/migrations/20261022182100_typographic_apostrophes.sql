-- Typographic apostrophes in public content: a straight ' between two
-- letters (it's, Anastasia's, γι'αυτό) becomes ’. Quotes, primes (5'6) and
-- anything that is not between letters stay as they are. URLs, slugs,
-- emails, people's names, prices and statuses are left alone, and page sections
-- (jsonb) are fixed in the seed rather than here. Rich text (post and story
-- bodies, rich translation values) is curled only between tags, so a link's
-- address keeps its apostrophe. Only rows that change are written.

create or replace function pg_temp.curly(t text) returns text
language sql immutable as $$
  select regexp_replace(t, '(?<=[[:alpha:]])''(?=[[:alpha:]])', '’', 'g')
$$;

create or replace function pg_temp.straight(t text) returns boolean
language sql immutable as $$
  select coalesce(t ~ '[[:alpha:]]''[[:alpha:]]', false)
$$;

-- Rich text (HTML): curl only the text between tags, so an href or a mailto
-- keeps its straight apostrophe (Hansen's_disease, o'brien@…).
create or replace function pg_temp.curly_html(t text) returns text
language sql immutable as $$
  select coalesce(
    (select string_agg(case when m[1] ~ '^<' then m[1] else pg_temp.curly(m[1]) end, '' order by n)
     from regexp_matches(t, '<[^>]*>|[^<]+|<', 'g') with ordinality as r(m, n)),
    t)
$$;

-- The string values of a flat jsonb object (a translation's fields).
create or replace function pg_temp.curly_fields(f jsonb) returns jsonb
language sql immutable as $$
  select case
    when f is null or jsonb_typeof(f) <> 'object' then f
    else coalesce(
      (select jsonb_object_agg(k, case when jsonb_typeof(v) = 'string' then to_jsonb(pg_temp.curly_html(v #>> '{}')) else v end)
       from jsonb_each(f) as e(k, v)),
      '{}'::jsonb)
  end
$$;

update public.pages set
  title = pg_temp.curly(title), seo_title = pg_temp.curly(seo_title),
  seo_description = pg_temp.curly(seo_description)
where pg_temp.straight(concat_ws(' ', title, seo_title, seo_description));

update public.site_settings set
  tagline = pg_temp.curly(tagline), default_seo_title = pg_temp.curly(default_seo_title),
  default_seo_description = pg_temp.curly(default_seo_description),
  footer_text = pg_temp.curly(footer_text)
where pg_temp.straight(concat_ws(' ', tagline, default_seo_title, default_seo_description, footer_text));

update public.blog_posts set
  title = pg_temp.curly(title), excerpt = pg_temp.curly(excerpt), body = pg_temp.curly_html(body),
  seo_title = pg_temp.curly(seo_title), seo_description = pg_temp.curly(seo_description)
where pg_temp.straight(concat_ws(' ', title, excerpt, seo_title, seo_description)) or body is distinct from pg_temp.curly_html(body);

update public.books set
  title = pg_temp.curly(title), subtitle = pg_temp.curly(subtitle), tagline = pg_temp.curly(tagline),
  description = pg_temp.curly(description), who_for = pg_temp.curly(who_for),
  sample_text = pg_temp.curly(sample_text),
  seo_title = pg_temp.curly(seo_title), seo_description = pg_temp.curly(seo_description)
where pg_temp.straight(concat_ws(' ', title, subtitle, tagline, description, who_for, sample_text, seo_title, seo_description));

update public.testimonials set quote = pg_temp.curly(quote), role = pg_temp.curly(role)
where pg_temp.straight(concat_ws(' ', quote, role));

update public.audiobooks set
  title = pg_temp.curly(title), subtitle = pg_temp.curly(subtitle), description = pg_temp.curly(description)
where pg_temp.straight(concat_ws(' ', title, subtitle, description));

update public.audiobook_tracks set title = pg_temp.curly(title), opening_line = pg_temp.curly(opening_line)
where pg_temp.straight(concat_ws(' ', title, opening_line));

update public.products set
  name = pg_temp.curly(name), description = pg_temp.curly(description), who_for = pg_temp.curly(who_for),
  included = pg_temp.curly(included), stock_note = pg_temp.curly(stock_note),
  seo_title = pg_temp.curly(seo_title), seo_description = pg_temp.curly(seo_description)
where pg_temp.straight(concat_ws(' ', name, description, who_for, included, stock_note, seo_title, seo_description));

update public.masterclasses set
  title = pg_temp.curly(title), summary = pg_temp.curly(summary), description = pg_temp.curly(description),
  included = pg_temp.curly(included), schedule_note = pg_temp.curly(schedule_note),
  location = pg_temp.curly(location),
  seo_title = pg_temp.curly(seo_title), seo_description = pg_temp.curly(seo_description)
where pg_temp.straight(concat_ws(' ', title, summary, description, included, schedule_note, location, seo_title, seo_description));

update public.events set
  title = pg_temp.curly(title), summary = pg_temp.curly(summary), venue = pg_temp.curly(venue),
  city = pg_temp.curly(city),
  seo_title = pg_temp.curly(seo_title), seo_description = pg_temp.curly(seo_description)
where pg_temp.straight(concat_ws(' ', title, summary, venue, city, seo_title, seo_description));

update public.foundation_stories set
  title = pg_temp.curly(title), summary = pg_temp.curly(summary), body = pg_temp.curly_html(body),
  location = pg_temp.curly(location),
  seo_title = pg_temp.curly(seo_title), seo_description = pg_temp.curly(seo_description)
where pg_temp.straight(concat_ws(' ', title, summary, location, seo_title, seo_description)) or body is distinct from pg_temp.curly_html(body);

-- Alt text and captions are read aloud and shown under photographs.
update public.media_assets set alt = pg_temp.curly(alt), caption = pg_temp.curly(caption)
where pg_temp.straight(concat_ws(' ', alt, caption));

-- Greek (and any other) translations: the text values of fields and drafts.
update public.content_translations set
  fields = pg_temp.curly_fields(fields), draft_fields = pg_temp.curly_fields(draft_fields)
where fields is distinct from pg_temp.curly_fields(fields) or draft_fields is distinct from pg_temp.curly_fields(draft_fields);
