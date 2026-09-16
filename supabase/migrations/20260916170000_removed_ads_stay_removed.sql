-- An admin removal must hold. The old policy checked only the new status, so an owner could PATCH a
-- removed ad back to active through the REST API. Owners can still delete a removed ad.
drop policy listings_update_own on public.listings;
create policy listings_update_own on public.listings for update to authenticated
  using (user_id = (select auth.uid()) and status <> 'removed')
  with check (user_id = (select auth.uid()) and status <> 'removed');
