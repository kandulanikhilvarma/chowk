-- Listing photos: public read by URL, writes only inside the uploader's own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "listing images: owner reads own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "listing images: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "listing images: owner deletes own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Live chat, unread counts and notifications. Realtime still applies the SELECT policies.
alter publication supabase_realtime add table public.messages, public.conversations, public.notifications;