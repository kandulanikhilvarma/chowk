-- Chowk RLS and business-rule checks.
-- Run as postgres (execute_sql or psql). The block always ends with an exception, so nothing is kept.
-- Success: the error text starts with "RLS OK". Failure: it starts with "FAIL".
do $$
declare
  seller constant uuid := '00000000-0000-4000-8000-0000000000a1';
  buyer constant uuid := '00000000-0000-4000-8000-0000000000b2';
  guest constant uuid := '00000000-0000-4000-8000-0000000000c3';
  cat int; city int;
  lid uuid; lid2 uuid; cid uuid; cid2 uuid; did uuid; mid bigint;
  n int := 0; cnt int;
begin
  select id into cat from public.categories where slug = 'mobiles';
  select id into city from public.cities where slug = 'hyderabad';
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at, is_anonymous) values
    (seller, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seller@test.invalid', '{}', now(), now(), false),
    (buyer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'buyer@test.invalid', '{}', now(), now(), false),
    (guest, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, '{}', now(), now(), true);

  -- Seller ---------------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', seller, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.listings (category_id, title, description, price_paise, price_type, city_id, location)
  values (cat, 'e2e_ phone', 'test', 100000, 'fixed', city, extensions.st_setsrid(extensions.st_makepoint(78.48, 17.38), 4326)::extensions.geography)
  returning id into lid;
  insert into public.listings (category_id, title, description, price_paise, price_type, city_id, location)
  values (cat, 'e2e_ phone two', 'test', 100000, 'fixed', city, extensions.st_setsrid(extensions.st_makepoint(78.48, 17.38), 4326)::extensions.geography)
  returning id into lid2;
  n := n + 1;

  begin
    update public.profiles set role = 'admin' where id = seller;
    raise exception 'FAIL: seller promoted self to admin' using errcode = 'CHW01';
  exception when insufficient_privilege then n := n + 1;
  end;

  begin
    update public.listings set report_count = 0, bumped_at = now() + interval '1 year' where id = lid;
    raise exception 'FAIL: seller changed report_count or bumped_at' using errcode = 'CHW01';
  exception when insufficient_privilege then n := n + 1;
  end;

  begin
    insert into public.notifications (user_id, kind, title) values (buyer, 'system', 'fake');
    raise exception 'FAIL: client inserted a notification' using errcode = 'CHW01';
  exception when insufficient_privilege then n := n + 1;
  end;

  begin
    perform public.start_conversation(lid, 'self chat');
    raise exception 'FAIL: seller opened a chat on own ad' using errcode = 'CHW01';
  exception when raise_exception then n := n + 1;
  end;

  insert into public.profile_private (upi_id) values ('seller@okaxis');
  insert into public.listing_images (listing_id, path, thumb_path) values (lid2, seller::text || '/a.webp', seller::text || '/a_t.webp');

  -- Buyer ----------------------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  cid := public.start_conversation(lid, 'Is it still available?');
  cid2 := public.start_conversation(lid2, 'Hello');
  insert into public.messages (conversation_id, kind, body, offer_paise) values (cid, 'offer', 'Offer 900', 90000);
  n := n + 1;

  begin
    insert into public.messages (conversation_id, kind, body) values (cid, 'system', 'fake system message');
    raise exception 'FAIL: client posted a system message' using errcode = 'CHW01';
  exception when insufficient_privilege then n := n + 1;
  end;

  select id into mid from public.messages where conversation_id = cid and kind = 'offer';
  begin
    perform public.respond_offer(mid, true);
    raise exception 'FAIL: buyer accepted own offer' using errcode = 'CHW01';
  exception when no_data_found then n := n + 1;
  end;

  begin
    perform public.mark_sold(lid, cid);
    raise exception 'FAIL: buyer marked the seller ad sold' using errcode = 'CHW01';
  exception when no_data_found then n := n + 1;
  end;

  select count(*) into cnt from public.notifications where user_id = seller;
  if cnt <> 0 then raise exception 'FAIL: buyer can read seller notifications' using errcode = 'CHW01'; end if;
  select count(*) into cnt from public.profile_private;
  if cnt <> 0 then raise exception 'FAIL: buyer can read seller UPI row' using errcode = 'CHW01'; end if;
  if public.handoff_upi(cid) is not null then raise exception 'FAIL: UPI shown before both met' using errcode = 'CHW01'; end if;
  perform public.mark_met(cid);
  n := n + 3;

  begin
    insert into storage.objects (bucket_id, name) values ('listing-images', seller::text || '/x.webp');
    raise exception 'FAIL: buyer wrote into seller storage folder' using errcode = 'CHW01';
  exception when insufficient_privilege then n := n + 1;
  end;

  -- Guest (stranger to the chat) ---------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into cnt from public.messages where conversation_id = cid;
  if cnt <> 0 then raise exception 'FAIL: stranger read chat messages' using errcode = 'CHW01'; end if;
  select count(*) into cnt from public.conversations where id = cid;
  if cnt <> 0 then raise exception 'FAIL: stranger read a conversation' using errcode = 'CHW01'; end if;
  n := n + 2;

  begin
    insert into public.messages (conversation_id, body) values (cid, 'hijack');
    raise exception 'FAIL: stranger posted into a chat' using errcode = 'CHW01';
  exception when insufficient_privilege then n := n + 1;
  end;

  if public.handoff_upi(cid) is not null then raise exception 'FAIL: stranger got the UPI ID' using errcode = 'CHW01'; end if;
  n := n + 1;

  -- Guest reports are stored but do not count toward the auto-hide.
  insert into public.reports (listing_id, reason) values (lid2, 'scam');

  -- Seller answers, meets, sells --------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', seller, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into cnt from public.notifications where user_id = seller and kind in ('message', 'offer');
  if cnt < 2 then raise exception 'FAIL: seller missing chat or offer notifications (%)', cnt using errcode = 'CHW01'; end if;
  perform public.respond_offer(mid, true);
  begin
    perform public.respond_offer(mid, false);
    raise exception 'FAIL: offer answered twice' using errcode = 'CHW01';
  exception when raise_exception then n := n + 1;
  end;
  perform public.mark_met(cid);
  did := public.mark_sold(lid, cid);
  n := n + 3;

  -- Buyer sees UPI, reviews ------------------------------------------------------------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  if public.handoff_upi(cid) is distinct from 'seller@okaxis' then
    raise exception 'FAIL: buyer did not get UPI after both met' using errcode = 'CHW01';
  end if;
  begin
    perform public.submit_review(did, true, true);
    raise exception 'FAIL: review before both confirmed' using errcode = 'CHW01';
  exception when raise_exception then n := n + 2;
  end;
  perform public.confirm_deal(did);
  perform public.submit_review(did, true, true, 'Smooth deal');
  begin
    perform public.submit_review(did, true, true);
    raise exception 'FAIL: second review for the same deal' using errcode = 'CHW01';
  exception when unique_violation then n := n + 1;
  end;

  -- Buyer blocks seller; seller can no longer message ----------------------------------------------
  insert into public.blocks (blocked_id) values (seller);
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', seller, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.messages (conversation_id, body) values (cid2, 'still there?');
    raise exception 'FAIL: blocked seller still sent a message' using errcode = 'CHW01';
  exception when insufficient_privilege then n := n + 1;
  end;

  -- Guest cannot confirm a deal that is not theirs; guest can delete own account -----------------
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', guest, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    perform public.confirm_deal(did);
    raise exception 'FAIL: stranger confirmed a deal' using errcode = 'CHW01';
  exception when no_data_found then n := n + 1;
  end;
  if public.is_blocked_between(buyer, seller) then
    raise exception 'FAIL: stranger can see who blocked whom' using errcode = 'CHW01';
  end if;
  n := n + 1;
  perform public.delete_account();

  -- Buyer (a real account) reports the same listing; only this report counts.
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', buyer, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.reports (listing_id, reason) values (lid2, 'scam');

  execute 'reset role';
  if (select report_count from public.listings where id = lid2) <> 1 then
    raise exception 'FAIL: guest report counted toward auto-hide, or real report did not' using errcode = 'CHW01';
  end if;
  n := n + 2;
  update public.listings set status = 'removed' where id = lid2;

  -- Anonymous visitor ------------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';

  select count(*) into cnt from public.listing_images where listing_id = lid2;
  if cnt <> 0 then raise exception 'FAIL: photos of a removed listing are still readable' using errcode = 'CHW01'; end if;
  n := n + 1;

  select count(*) into cnt from public.search_listings(p_q => 'royal enfield');
  if cnt = 0 then raise exception 'FAIL: keyword search found no demo bike' using errcode = 'CHW01'; end if;
  select count(*) into cnt from public.search_listings(p_lat => 17.385, p_lng => 78.4867, p_radius_km => 10) s where s.distance_km > 10;
  if cnt <> 0 then raise exception 'FAIL: radius search returned far listings' using errcode = 'CHW01'; end if;
  select count(*) into cnt from public.search_listings(p_category => 'bikes') s where s.category_slug <> 'bikes';
  if cnt <> 0 then raise exception 'FAIL: category filter leaked other categories' using errcode = 'CHW01'; end if;
  if (public.profile_public_stats(seller) ->> 'deals')::int <> 1 then
    raise exception 'FAIL: seller deals count is not 1' using errcode = 'CHW01';
  end if;
  n := n + 4;

  begin
    perform public.start_conversation(lid2, 'anon');
    raise exception 'FAIL: anon started a chat' using errcode = 'CHW01';
  exception when insufficient_privilege then n := n + 1;
  end;
  begin
    select count(*) into cnt from public.conversations;
    if cnt <> 0 then raise exception 'FAIL: anon read conversations' using errcode = 'CHW01'; end if;
  exception when insufficient_privilege then null;
  end;
  n := n + 1;

  execute 'reset role';
  if exists (select 1 from auth.users where id = guest) then
    raise exception 'FAIL: delete_account left the auth user' using errcode = 'CHW01';
  end if;
  n := n + 1;

  raise exception 'RLS OK: % checks passed', n;
end $$;
