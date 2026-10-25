-- Desktop bar: Explore, then About, then Contact. The phone menu keeps its
-- own order in the header component. Only the still-seeded labels move.

update public.navigation_items
set position = 0
where menu = 'header' and parent_id is null and label = 'Explore';

update public.navigation_items
set position = 1
where menu = 'header' and parent_id is null and label = 'About';

update public.navigation_items
set position = 2
where menu = 'header' and parent_id is null and label = 'Contact';
