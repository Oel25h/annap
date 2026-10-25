-- Desktop header: About, Explore, Contact. Explore holds Books, Stories,
-- Videos, Gallery and Foundation. The phone menu flattens those links, so
-- this does not change what a phone shows. Footer menus are left alone.
-- Stops once Explore exists, so a menu the owner has regrouped stays put.

do $$
declare
  explore_id uuid;
begin
  if exists (
    select 1 from public.navigation_items
    where menu = 'header' and parent_id is null and label = 'Explore'
  ) then
    return;
  end if;

  -- A row needs a page or an address. Explore is a label, so it points at
  -- home and the header draws it as a button, not a link.
  insert into public.navigation_items (menu, label, page_id, url, parent_id, position)
  values ('header', 'Explore', null, '/', null, 1)
  returning id into explore_id;

  update public.navigation_items
  set parent_id = explore_id,
      position = case label
        when 'Books' then 0
        when 'Stories' then 1
        when 'Videos' then 2
        when 'Gallery' then 3
        when 'Foundation' then 4
        else position
      end
  where menu = 'header'
    and parent_id is null
    and label in ('Books', 'Stories', 'Videos', 'Gallery', 'Foundation');

  update public.navigation_items
  set position = 0
  where menu = 'header' and parent_id is null and label = 'About';

  update public.navigation_items
  set position = 2
  where menu = 'header' and parent_id is null and label = 'Contact';
end $$;
