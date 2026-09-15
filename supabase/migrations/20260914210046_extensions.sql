-- Extensions live in their own schema so the public API never exposes their tables.
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;