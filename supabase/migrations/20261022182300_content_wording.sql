-- Brings wording seeded by an earlier 20261022180500_redo_content.sql (and the
-- gallery-and-shop seed) in line with the current seed. Like
-- 20261022182200_content_closeout.sql, every change applies only where the row
-- still holds the earlier seed, so nothing edited in the studio is touched, and
-- on a database seeded with the current version it changes nothing. It sorts
-- after the closeout, which writes the old /start description.

-- "eBook", as everywhere else on the site (DESIGN.md §13: the gated download is
-- Free eBook). The ebook_gate consent wording keeps its version 1 text.
update public.pages
set seo_description = 'Everything in one place: the free eBook, the audiobook, my stories, masterclasses and the foundation.'
where path = '/start'
  and seo_description = 'Everything in one place: the free ebook, the audiobook, my stories, masterclasses and the foundation.';

update public.pages
set seo_description = 'Memoir, workbook and gentle wisdom: books to carry you through the seasons you cannot skip, in print, eBook and audio.'
where path = '/books'
  and seo_description = 'Memoir, workbook and gentle wisdom: books to carry you through the seasons you cannot skip, in print, ebook and audio.';

update public.pages p
set sections = jsonb_set(p.sections, '{0,props,items}', (
  select jsonb_agg(case when e ->> 'label' = 'Get the free ebook' then jsonb_set(e, '{label}', '"Get the free eBook"') else e end order by i)
  from jsonb_array_elements(p.sections #> '{0,props,items}') with ordinality as x(e, i)
))
where p.path = '/start'
  and p.sections #>> '{0,type}' = 'link_list'
  and jsonb_typeof(p.sections #> '{0,props,items}') = 'array'
  and p.sections #> '{0,props,items}' @> '[{"label": "Get the free ebook"}]';

update public.pages
set sections = jsonb_set(sections, '{0,props,body}', to_jsonb(replace(replace(replace(sections #>> '{0,props,body}',
  '<strong>Free ebook:</strong>', '<strong>Free eBook:</strong>'),
  'the ebook you requested', 'the eBook you requested'),
  '<li>Free ebook requests:', '<li>Free eBook requests:')))
where path = '/privacy'
  and sections #>> '{0,type}' = 'rich_text'
  and sections #>> '{0,props,body}' like any (array['%<strong>Free ebook:</strong>%', '%the ebook you requested%', '%<li>Free ebook requests:%']);

update public.pages
set sections = jsonb_set(sections, '{0,props,body}', to_jsonb(replace(sections #>> '{0,props,body}',
  '<p>Ebooks, audio and other digital products', '<p>eBooks, audio and other digital products')))
where path = '/terms'
  and sections #>> '{0,type}' = 'rich_text'
  and strpos(sections #>> '{0,props,body}', '<p>Ebooks, audio and other digital products') > 0;

-- Sentence case for everything but book and chapter titles (DESIGN.md §3).
update public.masterclasses
set title = 'Turn your story into a digital business'
where slug = 'masterclass' and title = 'Turn Your Story Into A Digital Business';

update public.pages p
set sections = jsonb_set(p.sections, '{0,props,items}', (
  select jsonb_agg(case when e ->> 'label' = 'Contact Me' then jsonb_set(e, '{label}', to_jsonb('Contact me'::text)) else e end order by i)
  from jsonb_array_elements(p.sections #> '{0,props,items}') with ordinality as x(e, i)
))
where p.path = '/start'
  and p.sections #>> '{0,type}' = 'link_list'
  and jsonb_typeof(p.sections #> '{0,props,items}') = 'array'
  and p.sections #> '{0,props,items}' @> '[{"label": "Contact Me"}]';

-- About foreword: stories, not "blog post" (DESIGN.md §13, Names).
update public.pages
set sections = jsonb_set(sections, '{1,props,body}', to_jsonb(replace(sections #>> '{1,props,body}',
  'every book, masterclass, and blog post I make is',
  'every book, masterclass, and story I share is')))
where path = '/about'
  and sections #>> '{1,id}' = 'c0de0012-0000-4000-8000-000000000012'
  and sections #>> '{1,type}' = 'rich_text'
  and sections #>> '{1,props,body}' like '%every book, masterclass, and blog post I make is%';

-- The shop's bridge to the book (20260824120000_seed_gallery_shop.sql) had
-- "See books" typed into its price, which the shop shows as the price. It has
-- no price of its own: clear it, only where the row still holds the seed.
update public.products set price = null
where slug = 'find-your-reason-to-smile-companion' and price = 'See books';
