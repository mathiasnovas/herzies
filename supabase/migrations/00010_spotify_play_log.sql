-- Log of Spotify tracks credited via server-side catch-up (for deduplication)
create table if not exists public.spotify_play_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  spotify_track_id text not null,
  played_at timestamptz not null,
  track_name text,
  artist_name text,
  duration_ms integer,
  xp_credited real not null default 0,
  created_at timestamptz not null default now()
);

-- Deduplication: one entry per user + track + played_at
create unique index idx_spotify_play_log_dedup
  on public.spotify_play_log(user_id, spotify_track_id, played_at);

-- For querying recent plays per user
create index idx_spotify_play_log_user_played
  on public.spotify_play_log(user_id, played_at desc);

-- RLS: service-role only (no public policies)
alter table public.spotify_play_log enable row level security;
