-- Each demo title was seeded in 2 to 4 cities within minutes, so a newest-first browse of all India
-- showed the same photo twice in the first row. Space the copies of one title 4 days apart.
-- Expiry is not changed, so every demo ad stays online.
with ranked as (
  select id, row_number() over (partition by title order by city_id) - 1 as step
  from public.listings
  where is_demo
)
update public.listings l
set created_at = l.created_at - r.step * interval '4 days',
    bumped_at = l.bumped_at - r.step * interval '4 days'
from ranked r
where l.id = r.id and r.step > 0;
