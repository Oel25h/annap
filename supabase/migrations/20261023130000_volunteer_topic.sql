-- The home foundation section's "Volunteer" link opens the contact form with
-- Volunteering chosen. Applies only where the row still holds the earlier seed.
update public.pages p
set sections = (
  select jsonb_agg(
    case when e ->> 'type' = 'two_column'
          and e #>> '{props,link,label}' = 'Volunteer'
          and e #>> '{props,link,href}' = '/contact'
         then jsonb_set(e, '{props,link,href}', '"/contact?topic=volunteering"')
         else e end
    order by i)
  from jsonb_array_elements(p.sections) with ordinality as x(e, i)
)
where p.path = '/'
  and jsonb_typeof(p.sections) = 'array'
  and p.sections @> '[{"type":"two_column","props":{"link":{"label":"Volunteer","href":"/contact"}}}]';
