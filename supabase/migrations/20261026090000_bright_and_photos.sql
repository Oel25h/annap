-- The site is bright, like the original (Joel, 2026-10-23): the dark "cocoa"
-- band is retired, so any section stored on it moves to ivory. The renderer
-- already reads a leftover "cocoa" as ivory; this keeps the stored data honest.
--
-- Joel's own photos come back into use (scripts/content/media.ts, ids 16-23).
-- The gallery and the About page's last chapter pick them up only where they
-- still hold the earlier seed, so nothing edited in the studio is touched.
-- Run scripts/seed-media.ts after this migration to upload the new photos;
-- it also gives the starter posts and the masterclass their covers.

create or replace function pg_temp.no_cocoa(v jsonb) returns jsonb
language sql immutable as $$
  select replace(v::text, '"background": "cocoa"', '"background": "ivory"')::jsonb
$$;

update public.pages set sections = pg_temp.no_cocoa(sections)
where strpos(sections::text, '"background": "cocoa"') > 0;
update public.books set sections = pg_temp.no_cocoa(sections)
where strpos(sections::text, '"background": "cocoa"') > 0;
update public.products set sections = pg_temp.no_cocoa(sections)
where strpos(sections::text, '"background": "cocoa"') > 0;
update public.masterclasses set sections = pg_temp.no_cocoa(sections)
where strpos(sections::text, '"background": "cocoa"') > 0;
update public.events set sections = pg_temp.no_cocoa(sections)
where strpos(sections::text, '"background": "cocoa"') > 0;
update public.foundation_stories set sections = pg_temp.no_cocoa(sections)
where strpos(sections::text, '"background": "cocoa"') > 0;
update public.content_drafts set data = pg_temp.no_cocoa(data)
where strpos(data::text, '"background": "cocoa"') > 0;

-- Gallery: the four seeded photos become eleven.
update public.pages p
set sections = (
  select jsonb_agg(
    case
      when s ->> 'id' = 'c0de0050-0000-4000-8000-000000000050'
        and s #> '{props,imageMediaIds}' = '["5eed0000-0000-4000-8000-000000000004", "5eed0000-0000-4000-8000-000000000008", "5eed0000-0000-4000-8000-000000000002", "5eed0000-0000-4000-8000-000000000009"]'::jsonb
      then jsonb_set(s, '{props,imageMediaIds}', '["5eed0000-0000-4000-8000-000000000004", "5eed0000-0000-4000-8000-000000000018", "5eed0000-0000-4000-8000-000000000008", "5eed0000-0000-4000-8000-000000000002", "5eed0000-0000-4000-8000-000000000019", "5eed0000-0000-4000-8000-000000000020", "5eed0000-0000-4000-8000-000000000009", "5eed0000-0000-4000-8000-000000000005", "5eed0000-0000-4000-8000-000000000021", "5eed0000-0000-4000-8000-000000000003", "5eed0000-0000-4000-8000-000000000023"]'::jsonb)
      else s
    end
    order by ord
  )
  from jsonb_array_elements(p.sections) with ordinality as e(s, ord)
)
where p.path = '/gallery'
  and strpos(p.sections::text, 'c0de0050-0000-4000-8000-000000000050') > 0;

-- About, "Now": her photo at the author's table, if the chapter still has none.
update public.pages p
set sections = (
  select jsonb_agg(
    case
      when s ->> 'id' = 'c0de0022-0000-4000-8000-000000000022' then jsonb_set(
        s,
        '{props,items}',
        (
          select jsonb_agg(
            case
              when i ->> 'id' = 'c0de0021-0000-4000-8000-000000000021'
                and coalesce(i ->> 'imageMediaId', '') = ''
              then jsonb_set(i, '{imageMediaId}', '"5eed0000-0000-4000-8000-000000000005"')
              else i
            end
            order by iord
          )
          from jsonb_array_elements(s #> '{props,items}') with ordinality as it(i, iord)
        )
      )
      else s
    end
    order by ord
  )
  from jsonb_array_elements(p.sections) with ordinality as e(s, ord)
)
where p.path = '/about'
  and strpos(p.sections::text, 'c0de0021-0000-4000-8000-000000000021') > 0;
