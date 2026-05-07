-- Log of every track a user listens to (for stats: top artists, most-played songs, etc.)
create table if not exists public.listen_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  track_name text not null,
  artist_name text not null,
  genre text,
  source text not null default 'cli',
  listened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- For querying a user's recent listening history
create index idx_listen_log_user on public.listen_log(user_id, listened_at desc);

-- For "top artists" queries
create index idx_listen_log_artist on public.listen_log(user_id, artist_name);

-- For "most played songs" queries
create index idx_listen_log_track on public.listen_log(user_id, track_name, artist_name);

-- RLS: only authenticated users can insert their own rows, service-role for reads
alter table public.listen_log enable row level security;

-- Allow authenticated users to insert rows for themselves
create policy "Users can insert own listen_log"
  on public.listen_log for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow service_role full access (for cron jobs, admin queries)
-- (service_role bypasses RLS by default, so no explicit policy needed)
