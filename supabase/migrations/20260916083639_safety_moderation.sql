-- profiles.role is internal. Clients read every other column; the admin check runs as definer and
-- answers only for the caller.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
-- listings_read calls is_admin() for anon visitors too, so anon keeps EXECUTE. It returns false for them.
grant execute on function public.is_admin() to anon, authenticated;

revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, city_id, is_business, is_guest, deals_count, created_at)
  on public.profiles to anon, authenticated;
grant select (terms_accepted_at) on public.profiles to authenticated;

-- Admin decision on a report. Remove: the ad is removed, every open report on it closes, the owner
-- gets a notice. Dismiss: the reports close and the report count resets, so the ad shows in search again.
create function public.moderate_report(p_report bigint, p_remove boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.reports;
  owner uuid;
  outcome text := case when p_remove then 'actioned' else 'dismissed' end;
begin
  if not public.is_admin() then
    raise exception 'Only admins can moderate reports' using errcode = '42501';
  end if;

  select * into r from public.reports where id = p_report for update;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if r.listing_id is null then
    update public.reports set status = outcome
    where reported_user_id = r.reported_user_id and listing_id is null and status = 'open';
    return;
  end if;

  if p_remove then
    update public.listings set status = 'removed' where id = r.listing_id returning user_id into owner;
    if owner is not null then
      insert into public.notifications (user_id, kind, title, body, href)
      values (owner, 'system', 'Your ad was removed', 'It broke the Chowk rules. Read the terms before you post again.', '/terms');
    end if;
  else
    update public.listings set report_count = 0 where id = r.listing_id;
  end if;

  update public.reports set status = outcome where listing_id = r.listing_id and status = 'open';
end;
$$;
revoke execute on function public.moderate_report(bigint, boolean) from public, anon;
grant execute on function public.moderate_report(bigint, boolean) to authenticated;
