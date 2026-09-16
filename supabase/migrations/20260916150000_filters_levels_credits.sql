-- Phase 9: seller type and photo filters, active ad limits by level, Unsplash credits on demo ads.

-- Search filters ---------------------------------------------------------------------------
-- New parameters change the signature, so the old function goes first.
drop function public.search_listings(text, text, public.listing_kind, bigint, bigint, float8, float8, float8,
  public.item_condition, public.price_type, int, text, int, int);

create function public.search_listings(
  p_q text default null,
  p_category text default null,
  p_kind public.listing_kind default null,
  p_min_paise bigint default null,
  p_max_paise bigint default null,
  p_lat float8 default null,
  p_lng float8 default null,
  p_radius_km float8 default null,
  p_condition public.item_condition default null,
  p_price_type public.price_type default null,
  p_days int default null,
  p_seller text default null,
  p_has_photos boolean default null,
  p_sort text default 'newest',
  p_limit int default 24,
  p_offset int default 0
) returns table (
  id uuid,
  title text,
  price_paise bigint,
  price_type public.price_type,
  kind public.listing_kind,
  condition public.item_condition,
  status public.listing_status,
  city text,
  locality text,
  distance_km float8,
  created_at timestamptz,
  is_demo boolean,
  thumb_path text,
  demo_image_url text,
  category_slug text
)
language sql stable set search_path = '' as $$
  with origin as (
    select case when p_lat is not null and p_lng is not null
      then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    end as g
  ),
  q as (
    select case when nullif(btrim(p_q), '') is not null then websearch_to_tsquery('simple', p_q) end as tsq
  ),
  cat as (
    select c.id from public.categories c
    where c.slug = p_category
       or c.parent_id = (select parent.id from public.categories parent where parent.slug = p_category)
  )
  select
    l.id, l.title, l.price_paise, l.price_type, l.kind, l.condition, l.status,
    ci.name, l.locality,
    case when o.g is not null then round((extensions.st_distance(l.location, o.g) / 1000)::numeric, 2)::float8 end,
    l.created_at, l.is_demo,
    (select i.thumb_path from public.listing_images i where i.listing_id = l.id order by i.position limit 1),
    l.demo_image_url,
    cg.slug
  from public.listings l
  join public.cities ci on ci.id = l.city_id
  join public.categories cg on cg.id = l.category_id
  join public.profiles pr on pr.id = l.user_id
  cross join origin o
  cross join q
  where l.status in ('active', 'reserved')
    and l.expires_at > now()
    and l.report_count < 3
    and (p_category is null or l.category_id in (select cat.id from cat))
    and (p_kind is null or l.kind = p_kind)
    and (p_min_paise is null or coalesce(l.price_paise, 0) >= p_min_paise)
    and (p_max_paise is null or coalesce(l.price_paise, 0) <= p_max_paise)
    and (p_condition is null or l.condition = p_condition)
    and (p_price_type is null or l.price_type = p_price_type)
    and (p_days is null or l.created_at > now() - make_interval(days => p_days))
    and (p_seller is null or pr.is_business = (p_seller = 'business'))
    and (
      p_has_photos is not true
      or l.demo_image_url is not null
      or exists (select 1 from public.listing_images i where i.listing_id = l.id)
    )
    and (q.tsq is null or l.search @@ q.tsq or l.title operator(extensions.%>) p_q)
    and (o.g is null or p_radius_km is null or extensions.st_dwithin(l.location, o.g, p_radius_km * 1000))
  order by
    case when p_sort = 'nearest' and o.g is not null then extensions.st_distance(l.location, o.g) end asc nulls last,
    case when p_sort = 'price_asc' then l.price_paise end asc nulls last,
    case when p_sort = 'price_desc' then l.price_paise end desc nulls last,
    case when p_sort = 'relevance' and q.tsq is not null then ts_rank(l.search, q.tsq) end desc nulls last,
    l.bumped_at desc
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_listings(text, text, public.listing_kind, bigint, bigint, float8, float8,
  float8, public.item_condition, public.price_type, int, text, boolean, text, int, int) to anon, authenticated;

-- Saved searches keep the new filters. ----------------------------------------------------
create or replace function public.normalize_saved_search() returns trigger
language plpgsql set search_path = '' as $$
declare
  q jsonb := new.query;
begin
  new.query := jsonb_strip_nulls(jsonb_build_object(
    'q', left(nullif(btrim(q ->> 'q'), ''), 100),
    'category_id', (q ->> 'category_id')::int,
    'kind', case when q ->> 'kind' in ('offer', 'wanted') then q ->> 'kind' end,
    'min_paise', (q ->> 'min_paise')::bigint,
    'max_paise', (q ->> 'max_paise')::bigint,
    'lat', (q ->> 'lat')::float8,
    'lng', (q ->> 'lng')::float8,
    'radius_km', least(greatest((q ->> 'radius_km')::float8, 1), 100),
    'days', case when q ->> 'days' in ('1', '7', '30') then (q ->> 'days')::int end,
    'seller', case when q ->> 'seller' in ('private', 'business') then q ->> 'seller' end,
    'photos', case when q ->> 'photos' = 'true' then true end
  ));
  if (new.query ? 'lat') <> (new.query ? 'lng') then
    raise exception 'A saved location needs both latitude and longitude' using errcode = 'P0001';
  end if;
  if (select count(*) from public.saved_searches where user_id = new.user_id) >= 20 then
    raise exception 'You can save up to 20 searches' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- A new ad is always inside "posted within". Photos are added after the ad row, so the photo filter
-- cannot match here. ponytail: the alert ignores it; move matching to after the first photo if people complain.
create or replace function public.notify_saved_searches() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  parent int;
  business boolean;
begin
  select parent_id into parent from public.categories where id = new.category_id;
  select is_business into business from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, kind, title, body, href)
  select distinct on (s.user_id)
    s.user_id,
    'saved_search'::public.notification_kind,
    'New match for "' || s.label || '"',
    new.title,
    '/l/' || new.id
  from public.saved_searches s
  where s.user_id <> new.user_id
    and (not s.query ? 'category_id' or (s.query ->> 'category_id')::int in (new.category_id, parent))
    and (not s.query ? 'kind' or s.query ->> 'kind' = new.kind::text)
    and (not s.query ? 'min_paise' or coalesce(new.price_paise, 0) >= (s.query ->> 'min_paise')::bigint)
    and (not s.query ? 'max_paise' or coalesce(new.price_paise, 0) <= (s.query ->> 'max_paise')::bigint)
    and (not s.query ? 'seller' or (s.query ->> 'seller' = 'business') = business)
    and (not s.query ? 'q' or new.search @@ websearch_to_tsquery('simple', s.query ->> 'q'))
    and (
      not s.query ? 'lat'
      or extensions.st_dwithin(
        new.location,
        extensions.st_setsrid(
          extensions.st_makepoint((s.query ->> 'lng')::float8, (s.query ->> 'lat')::float8), 4326
        )::extensions.geography,
        coalesce((s.query ->> 'radius_km')::float8, 25) * 1000
      )
    )
  order by s.user_id, s.id;

  return new;
end;
$$;

-- Active ad limits by level ---------------------------------------------------------------
-- lib/badges.ts mirrors these numbers for the UI.
create function public.active_ad_limit(level text) returns int
language sql immutable set search_path = '' as $$
  select case level when 'regular' then 100 when 'trusted' then 50 else 20 end;
$$;
grant execute on function public.active_ad_limit(text) to anon, authenticated;

-- Runs on a new active ad, on a paused or sold ad that goes back to active, and on renew of an expired ad.
-- Definer: the count must see every ad of the owner, including hidden ones.
create function public.check_active_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cap int;
begin
  perform pg_advisory_xact_lock(hashtext('listings:' || new.user_id::text));
  select public.active_ad_limit(public.reputation_level(
    p.deals_count,
    (select count(distinct rv.reviewer_id) from public.reviews rv
     where rv.reviewee_id = p.id and rv.reliable and rv.counts)::int
  ))
  into cap
  from public.profiles p where p.id = new.user_id;

  if (
    select count(*) from public.listings
    where user_id = new.user_id and status = 'active' and expires_at > now() and id <> new.id
  ) >= cap then
    raise exception 'You can have % active ads at your level. Mark an ad as sold or pause one first.', cap
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_active_limit() from public, anon, authenticated;

create trigger listings_active_limit_insert before insert on public.listings
  for each row when (not new.is_demo and new.status = 'active')
  execute function public.check_active_limit();

create trigger listings_active_limit_update before update of status, expires_at on public.listings
  for each row when (
    not new.is_demo and new.status = 'active' and new.expires_at > now()
    and (old.status <> 'active' or old.expires_at <= now())
  )
  execute function public.check_active_limit();

-- Unsplash credits for demo photos --------------------------------------------------------
alter table public.listings
  add column demo_photo_by text check (char_length(demo_photo_by) <= 80),
  add column demo_photo_user text check (demo_photo_user ~ '^[A-Za-z0-9_]{1,40}$');

-- Three demo photos had no photographer on record. They move to credited photos of the same item.
update public.listings set demo_image_url = replace(demo_image_url, 'photo-1560184897-67f4a3f9a7fa', 'photo-1555041469-a586c61ea9bc')
where is_demo and demo_image_url like '%photo-1560184897-67f4a3f9a7fa%';
update public.listings set demo_image_url = replace(demo_image_url, 'photo-1580826623091-ee7cae3ca105', 'photo-1591517487866-e7c7bf9896fb')
where is_demo and demo_image_url like '%photo-1580826623091-ee7cae3ca105%';
update public.listings set demo_image_url = replace(demo_image_url, 'photo-1605270396307-d00ba5cda1d0', 'photo-1646119253693-0b80f2906791')
where is_demo and demo_image_url like '%photo-1605270396307-d00ba5cda1d0%';

update public.listings l set demo_photo_by = c.name, demo_photo_user = c.username
from (values
  ('photo-1496181133206-80ce9b88a853', 'Kari Shea', 'karishea'),
  ('photo-1523740856324-f2ce89135981', 'Chris Barbalis', 'cbarbalis'),
  ('photo-1524995997946-a1c2e315a42f', 'Susan Q Yin', 'syinq'),
  ('photo-1525201548942-d8732f6617a0', 'Jacek Dylag', 'dylu'),
  ('photo-1528121108018-743eef2e4a7a', 'Tommaso Pecchioli', 'pecchio'),
  ('photo-1537151608828-ea2b11777ee8', 'Alvan Nee', 'alvannee'),
  ('photo-1552053831-71594a27632d', 'Richard Brutyo', 'richardbrutyo'),
  ('photo-1555041469-a586c61ea9bc', 'Phillip Goldsberry', 'phillipgold'),
  ('photo-1559135141-2bea6465fccf', 'Kyaw Zay Ya', 'kyaw_zay_ya'),
  ('photo-1585060544812-6b45742d762f', 'Vojtech Bruzek', 'vojtechbruzek'),
  ('photo-1588872657578-7efd1f1555ed', 'Erick Cerritos', 'eroneko11'),
  ('photo-1591517487866-e7c7bf9896fb', 'hibiscus hibe', 'hibiscus_1'),
  ('photo-1593359677879-a4bb92f829d1', 'Nicolas J Leclercq', 'nicolasjleclercq'),
  ('photo-1610030469983-98e550d6193c', 'Bulbul Ahmed', 'bulbul252'),
  ('photo-1616756141603-6d37d5cde2a2', 'Urvi Kotasthane', 'ukotasthane'),
  ('photo-1622185135505-2d795003994a', 'Lino', 'linsartistry'),
  ('photo-1630699144867-37acec97df5a', 'Point3D Commercial Imaging Ltd.', '3dottawa'),
  ('photo-1646119253693-0b80f2906791', 'Vignesh Rajendran', 'vigneshrajendran_'),
  ('photo-1663852408695-f57f4d75a536', 'Vignesh Rajendran', 'vigneshrajendran_'),
  ('photo-1665249934445-1de680641f50', 'Danilo Rios', 'danrop')
) as c (photo, name, username)
where l.is_demo and l.demo_image_url like '%' || c.photo || '%';
