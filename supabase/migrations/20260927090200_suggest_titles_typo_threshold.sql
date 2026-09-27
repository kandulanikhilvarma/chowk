-- Title suggestions missed short typos. The %> operator uses pg_trgm's 0.6 default, and a typo like
-- "swfit" shares only about a third of its trigrams with "Swift". A 0.3 cutoff finds it.
-- ponytail: a scan over live titles, fine for thousands of ads; add a gin_trgm_ops index on title past that.
create or replace function public.suggest_titles(p_q text) returns setof text
language sql stable set search_path = '' as $$
  select t.title
  from (
    select distinct on (lower(l.title)) l.title,
      extensions.word_similarity(p_q, l.title) as score
    from public.listings l
    where char_length(btrim(p_q)) between 2 and 60
      and l.status in ('active', 'reserved')
      and l.expires_at > now()
      and l.report_count < 3
      and (extensions.word_similarity(p_q, l.title) >= 0.3 or l.title ilike btrim(p_q) || '%')
    order by lower(l.title), score desc
  ) t
  order by t.score desc, t.title
  limit 6;
$$;
