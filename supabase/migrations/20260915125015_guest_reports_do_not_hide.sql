-- Guest accounts cost nothing to create, so three guests could hide any listing through reports.
-- Guest reports are still stored for the admin queue, but only reports from real accounts count
-- toward the automatic hide at 3.
create or replace function public.count_reports() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.listing_id is not null
     and not coalesce((select p.is_guest from public.profiles p where p.id = new.reporter_id), true) then
    update public.listings set report_count = report_count + 1 where id = new.listing_id;
  end if;
  return null;
end;
$$;
