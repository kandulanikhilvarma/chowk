-- Posting, chatting, saving and reporting need a signed-in account. Guest (anonymous) sessions can
-- still read, but every write that creates content is refused here, so the API cannot skip the wall.
-- Restrictive policies are ANDed with the existing ownership policies, so those stay unchanged.

create function public.is_member()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false;
$$;

grant execute on function public.is_member() to anon, authenticated;

create policy listings_members_only on public.listings
  as restrictive for insert to authenticated with check ((select public.is_member()));

create policy listing_images_members_only on public.listing_images
  as restrictive for insert to authenticated with check ((select public.is_member()));

create policy favorites_members_only on public.favorites
  as restrictive for insert to authenticated with check ((select public.is_member()));

create policy saved_searches_members_only on public.saved_searches
  as restrictive for insert to authenticated with check ((select public.is_member()));

-- start_conversation runs as the caller, so this policy also covers it.
create policy conversations_members_only on public.conversations
  as restrictive for insert to authenticated with check ((select public.is_member()));

create policy messages_members_only on public.messages
  as restrictive for insert to authenticated with check ((select public.is_member()));

create policy reports_members_only on public.reports
  as restrictive for insert to authenticated with check ((select public.is_member()));

create policy "listing images: members upload" on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'listing-images' or (select public.is_member()));
