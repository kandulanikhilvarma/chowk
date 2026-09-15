-- A signed-in user could call is_blocked_between for any two people and learn who blocked whom.
-- Callers now get an answer only about blocks that involve themselves. The message policy and the
-- conversation trigger always pass the caller as one side, so their behaviour does not change.
create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) in (a, b) and exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;
