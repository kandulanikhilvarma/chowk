-- Chowk business rules: triggers and RPCs.
-- Every definer function pins search_path to '' and names every object in full.

-- Model corrections found while writing the flows ------------------------------------
-- "Met in person" happens before a sale, so it belongs to the chat, not the deal.
alter table public.deals drop column buyer_met_at, drop column seller_met_at;
alter table public.conversations add column buyer_met_at timestamptz, add column seller_met_at timestamptz;
-- Badges count distinct raters on read. Stored counters would let one person farm them.
alter table public.profiles drop column friendly_count, drop column reliable_count;

-- Levels ------------------------------------------------------------------------------
create function public.reputation_level(deals int, reliable_raters int) returns text
language sql immutable set search_path = '' as $$
  select case
    when deals >= 5 and reliable_raters >= 3 then 'regular'
    when deals >= 1 then 'trusted'
    else 'newcomer'
  end;
$$;

-- Listings -------------------------------------------------------------------------------
-- Location privacy: store the centre of a ~500 m grid cell, never the exact point.
create function public.snap_location() returns trigger
language plpgsql set search_path = '' as $$
declare
  cell constant double precision := 0.0045;
  pt extensions.geometry := new.location::extensions.geometry;
begin
  new.location := extensions.st_setsrid(
    extensions.st_makepoint(
      (floor(extensions.st_x(pt) / cell) + 0.5) * cell,
      (floor(extensions.st_y(pt) / cell) + 0.5) * cell
    ),
    4326
  )::extensions.geography;
  return new;
end;
$$;
create trigger listings_snap_location before insert or update of location on public.listings
  for each row execute function public.snap_location();

create function public.check_listing_limits() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (
    select count(*) from public.listings
    where user_id = new.user_id and created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'You can post up to 10 ads a day. Try again tomorrow.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger listings_limits before insert on public.listings
  for each row when (not new.is_demo) execute function public.check_listing_limits();

create function public.notify_saved_searches() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  parent int;
begin
  select parent_id into parent from public.categories where id = new.category_id;

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
create trigger listings_saved_search_match after insert on public.listings
  for each row when (not new.is_demo and new.status = 'active')
  execute function public.notify_saved_searches();

create function public.notify_price_drop() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, kind, title, body, href)
  select f.user_id, 'price_drop'::public.notification_kind, 'Price dropped', new.title, '/l/' || new.id
  from public.favorites f
  where f.listing_id = new.id and f.user_id <> new.user_id;
  return new;
end;
$$;
create trigger listings_price_drop after update of price_paise on public.listings
  for each row when (new.price_paise < old.price_paise and new.status = 'active')
  execute function public.notify_price_drop();

create function public.count_favorites() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.listings
  set favorites_count = greatest(favorites_count + case when tg_op = 'INSERT' then 1 else -1 end, 0)
  where id = coalesce(new.listing_id, old.listing_id);
  return null;
end;
$$;
create trigger favorites_count after insert or delete on public.favorites
  for each row execute function public.count_favorites();

create function public.count_reports() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.listing_id is not null then
    update public.listings set report_count = report_count + 1 where id = new.listing_id;
  end if;
  return null;
end;
$$;
create trigger reports_count after insert on public.reports
  for each row execute function public.count_reports();

-- Saved searches: store only known keys with valid types, so a bad row can never break a listing insert.
create function public.normalize_saved_search() returns trigger
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
    'radius_km', least(greatest((q ->> 'radius_km')::float8, 1), 100)
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
create trigger saved_searches_normalize before insert on public.saved_searches
  for each row execute function public.normalize_saved_search();

-- Conversations and messages ----------------------------------------------------------
create function public.prepare_conversation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  l record;
begin
  select user_id, status, expires_at into l from public.listings where id = new.listing_id;
  if not found or l.status not in ('active', 'reserved') or l.expires_at <= now() then
    raise exception 'This ad is no longer available' using errcode = 'P0001';
  end if;
  if l.user_id = new.buyer_id then
    raise exception 'You cannot start a chat about your own ad' using errcode = 'P0001';
  end if;
  if public.is_blocked_between(l.user_id, new.buyer_id) then
    raise exception 'You cannot contact this person' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.conversations
    where buyer_id = new.buyer_id and created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'You can start up to 20 chats a day. Try again tomorrow.' using errcode = 'P0001';
  end if;
  new.seller_id := l.user_id;
  return new;
end;
$$;
create trigger conversations_prepare before insert on public.conversations
  for each row execute function public.prepare_conversation();

create function public.prepare_message() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.body := btrim(new.body);
  new.offer_state := case when new.kind = 'offer' then 'pending'::public.offer_state end;
  return new;
end;
$$;
create trigger messages_prepare before insert on public.messages
  for each row execute function public.prepare_message();

create function public.after_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c record;
  recipient uuid;
begin
  update public.conversations set last_message_at = new.created_at
  where id = new.conversation_id
  returning buyer_id, seller_id into c;

  if new.sender_id is null then
    return null;
  end if;

  recipient := case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end;

  if new.kind = 'offer' then
    insert into public.notifications (user_id, kind, title, body, href)
    values (recipient, 'offer', 'New offer', new.body, '/messages/' || new.conversation_id);
  elsif not exists (
    select 1 from public.messages m where m.conversation_id = new.conversation_id and m.id <> new.id
  ) then
    insert into public.notifications (user_id, kind, title, body, href)
    values (recipient, 'message', 'New chat about your ad', left(new.body, 140), '/messages/' || new.conversation_id);
  end if;

  return null;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.after_message();

-- RPCs: reading ---------------------------------------------------------------------------
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

create function public.price_hint(p_category int) returns jsonb
language sql stable set search_path = '' as $$
  select case when count(*) >= 3 then jsonb_build_object(
    'median_paise', (percentile_cont(0.5) within group (order by price_paise))::bigint,
    'low_paise', (percentile_cont(0.25) within group (order by price_paise))::bigint,
    'high_paise', (percentile_cont(0.75) within group (order by price_paise))::bigint,
    'count', count(*)
  ) end
  from public.listings
  where category_id = p_category
    and kind = 'offer'
    and price_type in ('fixed', 'negotiable')
    and status in ('active', 'reserved', 'sold')
    and created_at > now() - interval '180 days';
$$;

-- Aggregates only. Raw messages and reviewer lists stay private.
create function public.profile_public_stats(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with r as (
    select
      count(distinct reviewer_id) filter (where friendly) as friendly_raters,
      count(distinct reviewer_id) filter (where reliable) as reliable_raters,
      count(*) as ratings
    from public.reviews
    where reviewee_id = p_user and counts
  ),
  replies as (
    select
      c.created_at,
      (select min(m.created_at) from public.messages m where m.conversation_id = c.id and m.sender_id = p_user) as first_reply
    from public.conversations c
    where c.seller_id = p_user and c.created_at > now() - interval '90 days'
  )
  select jsonb_build_object(
    'deals', p.deals_count,
    'friendly_raters', r.friendly_raters,
    'reliable_raters', r.reliable_raters,
    'ratings', r.ratings,
    'level', public.reputation_level(p.deals_count, r.reliable_raters::int),
    'active_listings', (
      select count(*) from public.listings l
      where l.user_id = p_user and l.status = 'active' and l.expires_at > now()
    ),
    'reply_rate', (select case when count(*) >= 3 then round(100.0 * count(first_reply) / count(*)) end from replies),
    'reply_minutes', (
      select round((percentile_cont(0.5) within group (order by extract(epoch from first_reply - created_at) / 60))::numeric)
      from replies where first_reply is not null
    ),
    'member_since', p.created_at,
    'is_guest', p.is_guest
  )
  from public.profiles p
  cross join r
  where p.id = p_user;
$$;

-- The seller's UPI ID is visible to the buyer only after both say they met.
create function public.handoff_upi(p_conversation uuid) returns text
language sql stable security definer set search_path = '' as $$
  select pp.upi_id
  from public.conversations c
  join public.profile_private pp on pp.id = c.seller_id
  where c.id = p_conversation
    and c.buyer_id = (select auth.uid())
    and c.buyer_met_at is not null
    and c.seller_met_at is not null;
$$;

-- RPCs: writing --------------------------------------------------------------------------
create function public.start_conversation(p_listing uuid, p_body text) returns uuid
language plpgsql set search_path = '' as $$
declare
  cid uuid;
begin
  select id into cid from public.conversations
  where listing_id = p_listing and buyer_id = (select auth.uid());
  if cid is null then
    insert into public.conversations (listing_id) values (p_listing) returning id into cid;
  end if;
  insert into public.messages (conversation_id, body) values (cid, p_body);
  return cid;
end;
$$;

create function public.bump_listing(p_listing uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  l record;
  wait interval;
begin
  select li.bumped_at, li.status, p.deals_count,
    (select count(distinct rv.reviewer_id) from public.reviews rv
     where rv.reviewee_id = li.user_id and rv.reliable and rv.counts) as reliable_raters
  into l
  from public.listings li
  join public.profiles p on p.id = li.user_id
  where li.id = p_listing and li.user_id = (select auth.uid());

  if not found then
    raise exception 'Ad not found' using errcode = 'P0002';
  end if;
  if l.status <> 'active' then
    raise exception 'Only active ads can move up' using errcode = 'P0001';
  end if;

  wait := case
    when public.reputation_level(l.deals_count, l.reliable_raters::int) = 'regular' then interval '3 days'
    else interval '7 days'
  end;
  if l.bumped_at > now() - wait then
    raise exception 'You can move this ad up again on %',
      to_char((l.bumped_at + wait) at time zone 'Asia/Kolkata', 'DD Mon') using errcode = 'P0001';
  end if;

  update public.listings set bumped_at = now() where id = p_listing;
  return now();
end;
$$;

create function public.renew_listing(p_listing uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  new_expiry timestamptz := now() + interval '60 days';
begin
  update public.listings set expires_at = new_expiry
  where id = p_listing and user_id = (select auth.uid()) and status <> 'removed';
  if not found then
    raise exception 'Ad not found' using errcode = 'P0002';
  end if;
  return new_expiry;
end;
$$;

create function public.respond_offer(p_message bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m record;
begin
  select msg.sender_id, msg.offer_state, msg.conversation_id, c.buyer_id, c.seller_id
  into m
  from public.messages msg
  join public.conversations c on c.id = msg.conversation_id
  where msg.id = p_message and msg.kind = 'offer';

  if not found
     or (select auth.uid()) not in (m.buyer_id, m.seller_id)
     or m.sender_id = (select auth.uid()) then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if m.offer_state <> 'pending' then
    raise exception 'This offer already has an answer' using errcode = 'P0001';
  end if;

  update public.messages
  set offer_state = case when p_accept then 'accepted'::public.offer_state else 'declined'::public.offer_state end
  where id = p_message;

  insert into public.messages (conversation_id, sender_id, kind, body)
  values (
    m.conversation_id, null, 'system',
    case when p_accept then 'Offer accepted. Agree on a safe public place and time to meet.' else 'Offer declined.' end
  );

  insert into public.notifications (user_id, kind, title, href)
  values (
    m.sender_id, 'offer',
    case when p_accept then 'Your offer was accepted' else 'Your offer was declined' end,
    '/messages/' || m.conversation_id
  );
end;
$$;

create function public.mark_read(p_conversation uuid) returns void
language sql security definer set search_path = '' as $$
  update public.conversations
  set buyer_last_read_at = case when buyer_id = (select auth.uid()) then now() else buyer_last_read_at end,
      seller_last_read_at = case when seller_id = (select auth.uid()) then now() else seller_last_read_at end
  where id = p_conversation and (select auth.uid()) in (buyer_id, seller_id);
$$;

create function public.mark_met(p_conversation uuid) returns void
language sql security definer set search_path = '' as $$
  update public.conversations
  set buyer_met_at = case when buyer_id = (select auth.uid()) then coalesce(buyer_met_at, now()) else buyer_met_at end,
      seller_met_at = case when seller_id = (select auth.uid()) then coalesce(seller_met_at, now()) else seller_met_at end
  where id = p_conversation and (select auth.uid()) in (buyer_id, seller_id);
$$;

-- Seller marks an ad sold, optionally to one chat partner. That opens a deal both confirm.
create function public.mark_sold(p_listing uuid, p_conversation uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  deal_id uuid;
  c record;
begin
  update public.listings set status = 'sold'
  where id = p_listing and user_id = (select auth.uid()) and status in ('active', 'reserved', 'paused');
  if not found then
    raise exception 'Ad not found' using errcode = 'P0002';
  end if;

  if p_conversation is not null then
    select id, buyer_id, seller_id into c
    from public.conversations
    where id = p_conversation and listing_id = p_listing and seller_id = (select auth.uid());
    if not found then
      raise exception 'Chat not found' using errcode = 'P0002';
    end if;

    insert into public.deals as d (conversation_id, listing_id, buyer_id, seller_id, seller_confirmed_at)
    values (c.id, p_listing, c.buyer_id, c.seller_id, now())
    on conflict (conversation_id) do update set seller_confirmed_at = coalesce(d.seller_confirmed_at, now())
    returning d.id into deal_id;

    insert into public.notifications (user_id, kind, title, body, href)
    values (c.buyer_id, 'deal', 'Confirm your deal', 'The seller marked this item as sold to you.', '/messages/' || c.id);
  end if;

  insert into public.messages (conversation_id, sender_id, kind, body)
  select cv.id, null::uuid, 'system'::public.message_kind,
    case when cv.id = p_conversation
      then 'Marked as sold to you. Confirm the deal so you can rate each other.'
      else 'This item is now sold.'
    end
  from public.conversations cv
  where cv.listing_id = p_listing;

  return deal_id;
end;
$$;

create function public.confirm_deal(p_deal uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.deals;
  uid uuid := (select auth.uid());
begin
  select * into d from public.deals where id = p_deal and uid in (buyer_id, seller_id) for update;
  if not found then
    raise exception 'Deal not found' using errcode = 'P0002';
  end if;
  if (uid = d.buyer_id and d.buyer_confirmed_at is not null)
     or (uid = d.seller_id and d.seller_confirmed_at is not null) then
    return;
  end if;

  update public.deals
  set buyer_confirmed_at = case when uid = buyer_id then now() else buyer_confirmed_at end,
      seller_confirmed_at = case when uid = seller_id then now() else seller_confirmed_at end
  where id = p_deal
  returning * into d;

  -- Runs once: only the second confirmation reaches this point with both set.
  if d.buyer_confirmed_at is not null and d.seller_confirmed_at is not null then
    update public.profiles set deals_count = deals_count + 1 where id in (d.buyer_id, d.seller_id);
    insert into public.notifications (user_id, kind, title, href)
    select u, 'deal'::public.notification_kind, 'Deal done. Rate each other.', '/messages/' || d.conversation_id
    from unnest(array[d.buyer_id, d.seller_id]) as u;
  end if;
end;
$$;

create function public.submit_review(p_deal uuid, p_friendly boolean, p_reliable boolean, p_comment text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  d public.deals;
  uid uuid := (select auth.uid());
  target uuid;
  guest boolean;
begin
  select * into d from public.deals where id = p_deal and uid in (buyer_id, seller_id);
  if not found then
    raise exception 'Deal not found' using errcode = 'P0002';
  end if;
  if d.buyer_confirmed_at is null or d.seller_confirmed_at is null then
    raise exception 'Both people must confirm the deal first' using errcode = 'P0001';
  end if;

  target := case when uid = d.buyer_id then d.seller_id else d.buyer_id end;
  select is_guest into guest from public.profiles where id = uid;

  insert into public.reviews (deal_id, reviewer_id, reviewee_id, friendly, reliable, comment, counts)
  values (p_deal, uid, target, p_friendly, p_reliable, nullif(left(btrim(p_comment), 500), ''), not guest);

  insert into public.notifications (user_id, kind, title, href)
  values (target, 'review', 'You received a rating', '/u/' || target);
end;
$$;

create function public.delete_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = (select auth.uid());
$$;

-- Execute rights ----------------------------------------------------------------------------
revoke execute on function
  public.snap_location(), public.check_listing_limits(), public.notify_saved_searches(),
  public.notify_price_drop(), public.count_favorites(), public.count_reports(),
  public.normalize_saved_search(), public.prepare_conversation(), public.prepare_message(),
  public.after_message()
from public, anon, authenticated;

revoke execute on function
  public.start_conversation(uuid, text), public.bump_listing(uuid), public.renew_listing(uuid),
  public.respond_offer(bigint, boolean), public.mark_read(uuid), public.mark_met(uuid),
  public.mark_sold(uuid, uuid), public.confirm_deal(uuid),
  public.submit_review(uuid, boolean, boolean, text), public.handoff_upi(uuid), public.delete_account()
from public, anon;

grant execute on function
  public.start_conversation(uuid, text), public.bump_listing(uuid), public.renew_listing(uuid),
  public.respond_offer(bigint, boolean), public.mark_read(uuid), public.mark_met(uuid),
  public.mark_sold(uuid, uuid), public.confirm_deal(uuid),
  public.submit_review(uuid, boolean, boolean, text), public.handoff_upi(uuid), public.delete_account()
to authenticated;

grant execute on function
  public.search_listings(text, text, public.listing_kind, bigint, bigint, float8, float8, float8,
    public.item_condition, public.price_type, int, text, int, int),
  public.price_hint(int), public.profile_public_stats(uuid), public.reputation_level(int, int)
to anon, authenticated;