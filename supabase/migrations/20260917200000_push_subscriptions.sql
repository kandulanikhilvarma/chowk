-- Web push endpoints, one row per browser a person allows alerts on.
-- The rows hold no ad or chat content: a title and body are built at send time from notifications.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The push service URL identifies the browser. It is the natural key, so a reinstall replaces.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- A person sees and removes only their own endpoints. Nobody can read another person's.
create policy push_subscriptions_own_select on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create policy push_subscriptions_own_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy push_subscriptions_own_update on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_own_delete on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Guest sessions cannot register an endpoint, matching every other write in the app.
create policy push_subscriptions_members_only on public.push_subscriptions
  as restrictive for insert to authenticated with check ((select public.is_member()));

-- Clients write only what a browser subscription gives them. created_at and last_seen_at
-- are server clocks, so they are not grantable.
grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth) on public.push_subscriptions to authenticated;
grant update (last_seen_at) on public.push_subscriptions to authenticated;
