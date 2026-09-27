-- Release 2 extras: seller avatars, price-drop badges, map pins, title suggestions, away mode,
-- photos in chat and an admin overview. Every rule from earlier migrations still holds.

-- Seller avatars ---------------------------------------------------------------------------
-- Google sign-in puts the profile photo in avatar_url (older tokens use picture). The app renders
-- only lh3.googleusercontent.com URLs, and the CSP allows no other host, so a hand-set value is inert.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, is_guest, avatar_url)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data ->> 'full_name', 40), ''), 'Chowk member'),
    coalesce(new.is_anonymous, false),
    left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 500)
  );
  return new;
end;
$$;

-- A guest who links Google stops being a guest and picks up the Google photo if they have none yet.
create or replace function public.handle_user_updated() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles
  set is_guest = coalesce(new.is_anonymous, false),
      display_name = case
        when display_name = 'Chowk member' and new.raw_user_meta_data ->> 'full_name' is not null
        then left(new.raw_user_meta_data ->> 'full_name', 40)
        else display_name
      end,
      avatar_url = coalesce(
        avatar_url,
        left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 500)
      )
  where id = new.id;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_updated() from public, anon, authenticated;

-- Members who signed up before this migration.
update public.profiles p
set avatar_url = left(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'), 500)
from auth.users u
where u.id = p.id
  and p.avatar_url is null
  and coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') is not null;

-- Price-drop badge ---------------------------------------------------------------------------
-- Remembers the last higher price so cards can say "Price dropped". Set only by this trigger:
-- no client grant covers the column. A price rise clears it, so the badge never shows a stale drop.
alter table public.listings add column previous_price_paise bigint;

create function public.remember_previous_price() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.price_paise is distinct from old.price_paise then
    new.previous_price_paise := case
      when old.price_paise is not null and new.price_paise is not null and new.price_paise < old.price_paise
      then greatest(old.price_paise, coalesce(old.previous_price_paise, 0))
    end;
  end if;
  return new;
end;
$$;
create trigger listings_remember_price before update of price_paise on public.listings
  for each row execute function public.remember_previous_price();
revoke execute on function public.remember_previous_price() from public, anon, authenticated;

-- Search returns the price drop and the snapped map point ------------------------------------
-- lat and lng are the ~500 m grid centre the database already stores (listings.location is
-- readable today); they are not the seller's spot. The return type changes, so the old function goes first.
drop function public.search_listings(text, text, public.listing_kind, bigint, bigint, float8, float8,
  float8, public.item_condition, public.price_type, int, text, boolean, text, int, int);

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
  category_slug text,
  previous_price_paise bigint,
  lat float8,
  lng float8
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
    cg.slug,
    l.previous_price_paise,
    extensions.st_y(l.location::extensions.geometry),
    extensions.st_x(l.location::extensions.geometry)
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

-- Title suggestions ------------------------------------------------------------------------
-- Live ad titles close to what the person typed, typos included (pg_trgm word similarity).
-- Invoker, so RLS applies; the same visibility rules as search.
create function public.suggest_titles(p_q text) returns setof text
language sql stable set search_path = '' as $$
  select t.title
  from (
    select distinct on (lower(l.title)) l.title,
      extensions.word_similarity(p_q, l.title) as score
    from public.listings l
    where char_length(btrim(p_q)) between 2 and 60
      and l.status in ('active', 'reserved')
      and l.expires_at > now()
      and l.report_count < 3
      and (l.title operator(extensions.%>) p_q or l.title ilike btrim(p_q) || '%')
    order by lower(l.title), score desc
  ) t
  order by t.score desc, t.title
  limit 6;
$$;
grant execute on function public.suggest_titles(text) to anon, authenticated;

-- Away mode --------------------------------------------------------------------------------
-- A seller on holiday says so. Ads stay up; the ad page and the chat show "Away until".
alter table public.profiles add column away_until date
  check (away_until is null or away_until < date '2100-01-01');
grant select (away_until) on public.profiles to anon, authenticated;
grant update (away_until) on public.profiles to authenticated;

-- Photos in chat ---------------------------------------------------------------------------
-- A photo message carries a Storage path instead of text. The bucket is private: only the two
-- people in the chat can read or add files, under a folder named after the conversation.
alter table public.messages add column image_path text
  check (image_path is null or image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$');
alter table public.messages add constraint messages_image_has_path
  check ((kind = 'image') = (image_path is not null));
grant insert (image_path) on public.messages to authenticated;

drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid())
  and kind in ('text', 'offer', 'image')
  and exists (
    select 1
    from public.conversations c
    join public.listings l on l.id = c.listing_id
    where c.id = conversation_id
      and (select auth.uid()) in (c.buyer_id, c.seller_id)
      and l.status in ('active', 'reserved')
      and not public.is_blocked_between(c.buyer_id, c.seller_id)
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create function public.is_chat_participant(p_folder text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id::text = p_folder and (select auth.uid()) in (c.buyer_id, c.seller_id)
  );
$$;
revoke execute on function public.is_chat_participant(text) from public, anon;
grant execute on function public.is_chat_participant(text) to authenticated;

create policy "chat images: participants read" on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-images' and public.is_chat_participant((storage.foldername(name))[1]));

create policy "chat images: participants upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and public.is_chat_participant((storage.foldername(name))[1])
    and (select public.is_member())
  );

-- Admin overview ---------------------------------------------------------------------------
-- Counts for the admin dashboard. Definer so it can count every row; it refuses anyone but an admin.
create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'ads_24h', (select count(*) from public.listings where created_at > now() - interval '24 hours'),
    'ads_7d', (select count(*) from public.listings where created_at > now() - interval '7 days'),
    'active_ads', (select count(*) from public.listings where status in ('active', 'reserved') and expires_at > now()),
    'members_7d', (select count(*) from public.profiles where not is_guest and created_at > now() - interval '7 days'),
    'members', (select count(*) from public.profiles where not is_guest),
    'chats_7d', (select count(*) from public.conversations where created_at > now() - interval '7 days'),
    'deals_7d', (
      select count(*) from public.deals
      where buyer_confirmed_at is not null and seller_confirmed_at is not null
        and greatest(buyer_confirmed_at, seller_confirmed_at) > now() - interval '7 days'
    ),
    'deals', (select count(*) from public.deals where buyer_confirmed_at is not null and seller_confirmed_at is not null),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'top_categories', (
      select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'ads', t.ads) order by t.ads desc), '[]'::jsonb)
      from (
        select c.name, count(*) as ads
        from public.listings l join public.categories c on c.id = l.category_id
        where l.created_at > now() - interval '30 days'
        group by c.name
        order by count(*) desc
        limit 5
      ) t
    )
  );
end;
$$;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
