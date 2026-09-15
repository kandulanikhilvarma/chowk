-- Two quick taps on "Accept" could both see a pending offer and post the system message twice.
-- Lock the offer row before checking its state.
create or replace function public.respond_offer(p_message bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m record;
begin
  select msg.sender_id, msg.offer_state, msg.conversation_id, c.buyer_id, c.seller_id
  into m
  from public.messages msg
  join public.conversations c on c.id = msg.conversation_id
  where msg.id = p_message and msg.kind = 'offer'
  for update of msg;

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

-- Parallel requests from one user could each count 9 and both insert. A per-user transaction lock
-- makes the count and the insert happen one request at a time for that user only.
create or replace function public.check_listing_limits() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('listings:' || new.user_id::text));
  if (
    select count(*) from public.listings
    where user_id = new.user_id and created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'You can post up to 10 ads a day. Try again tomorrow.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.prepare_conversation() returns trigger
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
  perform pg_advisory_xact_lock(hashtext('chats:' || new.buyer_id::text));
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
