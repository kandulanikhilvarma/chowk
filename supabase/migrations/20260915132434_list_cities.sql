-- PostgREST returns geography as encoded bytes. The city picker and radius search need plain coordinates.
create function public.list_cities()
returns table (id int, name text, state text, slug text, lat float8, lng float8)
language sql stable set search_path = '' as $$
  select c.id, c.name, c.state, c.slug,
    extensions.st_y(c.location::extensions.geometry),
    extensions.st_x(c.location::extensions.geometry)
  from public.cities c
  order by c.name;
$$;

grant execute on function public.list_cities() to anon, authenticated;
