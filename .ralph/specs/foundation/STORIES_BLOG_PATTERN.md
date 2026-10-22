# Foundation stories — blog pattern

## Shipped
- `foundation_categories` table (admin CRUD like blog categories)
- Seeded pillars: Food assistance · Compassionate care · Community support · Rescued animals
- `foundation_stories.category` text + admin select
- **Top story** = `featured` (pin above rest on public page)
- Public `/foundation`: category filter chips + Top stories lead + More stories grid
- Greek: optional category field on translation panel

## Studio workflow
1. Foundation → Story categories (add/rename/reorder)
2. Add story → pick category → Top story Yes/No → publish
3. Optional Greek draft/approve including category label

## Residual
- Single story page `/foundation/:slug` not built (anchors `#slug` only)
- Category filter labels are EN CMS names until EL translation on each story
