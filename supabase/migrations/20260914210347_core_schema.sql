-- Chowk core schema: tables, indexes, RLS and column grants.
-- Business rules (RPCs, triggers) live in 0003. Storage and Realtime live in 0004.

-- Types ---------------------------------------------------------------------
create type public.listing_kind as enum ('offer', 'wanted');
create type public.price_type as enum ('fixed', 'negotiable', 'free', 'swap');
create type public.item_condition as enum ('new', 'like_new', 'good', 'fair', 'for_parts');
create type public.listing_status as enum ('active', 'reserved', 'sold', 'paused', 'removed');
create type public.message_kind as enum ('text', 'offer', 'system');
create type public.offer_state as enum ('pending', 'accepted', 'declined');
create type public.report_reason as enum ('scam', 'prohibited', 'wrong_category', 'duplicate', 'offensive', 'other');
create type public.notification_kind as enum ('message', 'offer', 'saved_search', 'price_drop', 'deal', 'review', 'system');

-- Reference data --------------------------------------------------------------
create table public.cities (
  id int generated always as identity primary key,
  name text not null,
  state text not null,
  slug text not null unique,
  location extensions.geography(Point, 4326) not null,
  unique (name, state)
);

create table public.categories (
  id int generated always as identity primary key,
  parent_id int references public.categories (id),
  slug text not null unique,
  name text not null,
  icon text not null default 'package',
  position smallint not null default 0,
  attribute_schema jsonb not null default '[]'::jsonb
);
create index categories_parent_idx on public.categories (parent_id);

-- People ----------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Chowk member' check (char_length(display_name) between 1 and 40),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  city_id int references public.cities (id),
  is_business boolean not null default false,
  is_guest boolean not null default true,
  role text not null default 'user' check (role in ('user', 'admin')),
  terms_accepted_at timestamptz,
  deals_count int not null default 0,
  friendly_count int not null default 0,
  reliable_count int not null default 0,
  created_at timestamptz not null default now()
);
create index profiles_city_idx on public.profiles (city_id);

-- Kept apart from profiles so a public profile read can never include it.
create table public.profile_private (
  id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  upi_id text check (upi_id is null or upi_id ~ '^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64}$')
);

-- Listings --------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id int not null references public.categories (id),
  kind public.listing_kind not null default 'offer',
  title text not null check (char_length(title) between 5 and 90),
  description text not null default '' check (char_length(description) <= 4000),
  price_paise bigint check (price_paise is null or price_paise between 0 and 100000000000),
  price_type public.price_type not null default 'fixed',
  condition public.item_condition,
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  status public.listing_status not null default 'active',
  city_id int not null references public.cities (id),
  locality text check (char_length(locality) <= 60),
  pincode text check (pincode is null or pincode ~ '^[1-9][0-9]{5}$'),
  location extensions.geography(Point, 4326) not null,
  ships boolean not null default false,
  is_demo boolean not null default false,
  demo_image_url text,
  currency char(3) not null default 'INR',
  country_code char(2) not null default 'IN',
  report_count int not null default 0,
  favorites_count int not null default 0,
  bumped_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple'::regconfig, coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  constraint listings_price_required check (price_type in ('free', 'swap') or price_paise is not null)
);
create index listings_search_idx on public.listings using gin (search);
create index listings_title_trgm_idx on public.listings using gin (title extensions.gin_trgm_ops);
create index listings_location_idx on public.listings using gist (location);
create index listings_feed_idx on public.listings (status, bumped_at desc);
create index listings_category_idx on public.listings (category_id, status, bumped_at desc);
create index listings_user_idx on public.listings (user_id, created_at desc);
create index listings_city_idx on public.listings (city_id);

create table public.listing_images (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  path text not null,
  thumb_path text not null,
  position smallint not null default 0 check (position between 0 and 11),
  width int check (width between 1 and 4000),
  height int check (height between 1 and 4000),
  created_at timestamptz not null default now(),
  unique (listing_id, position),
  constraint listing_images_owner_path check (
    split_part(path, '/', 1) = user_id::text and split_part(thumb_path, '/', 1) = user_id::text
  )
);
create index listing_images_user_idx on public.listing_images (user_id);

create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on public.favorites (listing_id);

create table public.saved_searches (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  query jsonb not null check (jsonb_typeof(query) = 'object'),
  created_at timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches (user_id);

-- Conversations and deals -------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid default auth.uid() references public.profiles (id) on delete set null,
  kind public.message_kind not null default 'text',
  body text not null check (char_length(body) between 1 and 2000),
  offer_paise bigint check (offer_paise is null or offer_paise > 0),
  offer_state public.offer_state,
  created_at timestamptz not null default now(),
  check ((kind = 'offer') = (offer_paise is not null))
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  buyer_confirmed_at timestamptz,
  seller_confirmed_at timestamptz,
  buyer_met_at timestamptz,
  seller_met_at timestamptz,
  created_at timestamptz not null default now()
);
create index deals_listing_idx on public.deals (listing_id);
create index deals_buyer_idx on public.deals (buyer_id);
create index deals_seller_idx on public.deals (seller_id);

create table public.reviews (
  id bigint generated always as identity primary key,
  deal_id uuid not null references public.deals (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  friendly boolean not null,
  reliable boolean not null,
  comment text check (comment is null or char_length(comment) <= 500),
  counts boolean not null default true,
  created_at timestamptz not null default now(),
  unique (deal_id, reviewer_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);
create index reviews_reviewer_idx on public.reviews (reviewer_id);

-- Safety ------------------------------------------------------------------------
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  check (listing_id is not null or reported_user_id is not null)
);
create unique index reports_one_per_listing on public.reports (reporter_id, listing_id) where listing_id is not null;
create index reports_status_idx on public.reports (status, created_at);
create index reports_listing_idx on public.reports (listing_id);
create index reports_user_idx on public.reports (reported_user_id);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Helpers used by policies ----------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- Definer: a user cannot read the other person's blocks, but the policy must know.
create function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

-- Row level security --------------------------------------------------------------
alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.deals enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.notifications enable row level security;

create policy cities_read on public.cities for select to anon, authenticated using (true);
create policy categories_read on public.categories for select to anon, authenticated using (true);

create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy profile_private_own on public.profile_private for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy listings_read on public.listings for select to anon, authenticated using (
  (status in ('active', 'reserved', 'sold') and expires_at > now() and report_count < 3)
  or user_id = (select auth.uid())
  or (select public.is_admin())
);
create policy listings_insert_own on public.listings for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'active');
create policy listings_update_own on public.listings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status <> 'removed');
create policy listings_delete_own on public.listings for delete to authenticated
  using (user_id = (select auth.uid()));

create policy listing_images_read on public.listing_images for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy listing_images_insert_own on public.listing_images for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid()))
  );
create policy listing_images_delete_own on public.listing_images for delete to authenticated
  using (user_id = (select auth.uid()));

create policy favorites_own on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy saved_searches_own on public.saved_searches for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy conversations_read on public.conversations for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));
create policy conversations_insert on public.conversations for insert to authenticated
  with check (buyer_id = (select auth.uid()));

create policy messages_read on public.messages for select to authenticated using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
  )
);
create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid())
  and kind in ('text', 'offer')
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

create policy deals_read on public.deals for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

create policy reviews_read on public.reviews for select to anon, authenticated using (true);

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_own_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- Grants: start from nothing, then open only the columns a client may write. ---------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.cities, public.categories, public.profiles, public.listings,
  public.listing_images, public.reviews to anon, authenticated;
grant select on public.profile_private, public.favorites, public.saved_searches,
  public.conversations, public.messages, public.deals, public.reports, public.blocks,
  public.notifications to authenticated;

grant update (display_name, avatar_url, city_id, is_business, terms_accepted_at) on public.profiles to authenticated;
grant insert (upi_id), update (upi_id), delete on public.profile_private to authenticated;
grant insert (category_id, kind, title, description, price_paise, price_type, condition, attributes,
  city_id, locality, pincode, location, ships) on public.listings to authenticated;
grant update (category_id, kind, title, description, price_paise, price_type, condition, attributes,
  city_id, locality, pincode, location, ships, status) on public.listings to authenticated;
grant delete on public.listings to authenticated;
grant insert (listing_id, path, thumb_path, position, width, height), delete on public.listing_images to authenticated;
grant insert (listing_id), delete on public.favorites to authenticated;
grant insert (label, query), delete on public.saved_searches to authenticated;
grant insert (listing_id) on public.conversations to authenticated;
grant insert (conversation_id, kind, body, offer_paise) on public.messages to authenticated;
grant insert (listing_id, reported_user_id, reason, details) on public.reports to authenticated;
grant insert (blocked_id), delete on public.blocks to authenticated;
grant update (read_at), delete on public.notifications to authenticated;

-- Profile rows follow auth users --------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, is_guest)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data ->> 'full_name', 40), ''), 'Chowk member'),
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- A guest who links Google stops being a guest; their ratings start to count.
create function public.handle_user_updated() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles
  set is_guest = coalesce(new.is_anonymous, false),
      display_name = case
        when display_name = 'Chowk member' and new.raw_user_meta_data ->> 'full_name' is not null
        then left(new.raw_user_meta_data ->> 'full_name', 40)
        else display_name
      end
  where id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_updated after update of is_anonymous, raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_updated() from public, anon, authenticated;

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();