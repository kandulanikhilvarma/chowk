-- A sender has read their own message, so it must not count as unread for them.
create or replace function public.after_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c record;
  recipient uuid;
begin
  update public.conversations
  set last_message_at = new.created_at,
      buyer_last_read_at = case when new.sender_id = buyer_id then new.created_at else buyer_last_read_at end,
      seller_last_read_at = case when new.sender_id = seller_id then new.created_at else seller_last_read_at end
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
revoke execute on function public.after_message() from public, anon, authenticated;

-- Badge counts for the navigation. Invoker, so RLS limits it to the caller's rows.
create function public.unread_counts() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'chats', (
      select count(*) from public.conversations c
      where (c.buyer_id = (select auth.uid()) and (c.buyer_last_read_at is null or c.buyer_last_read_at < c.last_message_at))
         or (c.seller_id = (select auth.uid()) and (c.seller_last_read_at is null or c.seller_last_read_at < c.last_message_at))
    ),
    'notifications', (
      select count(*) from public.notifications n
      where n.user_id = (select auth.uid()) and n.read_at is null
    )
  );
$$;
revoke execute on function public.unread_counts() from public, anon;
grant execute on function public.unread_counts() to authenticated;
