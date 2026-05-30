alter table public.new_releases
  add column if not exists trailer_url text,
  add column if not exists genre_tags text[] default '{}',
  add column if not exists preorder_url text,
  add column if not exists hype_score integer default 0,
  add column if not exists is_free_to_play boolean default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'new_releases_hype_score_range'
  ) then
    alter table public.new_releases
      add constraint new_releases_hype_score_range
      check (hype_score is null or (hype_score >= 0 and hype_score <= 100))
      not valid;
  end if;
end $$;
