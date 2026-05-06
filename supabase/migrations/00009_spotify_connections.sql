-- Spotify account connections for server-side listening catch-up
create table if not exists public.spotify_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  spotify_user_id text not null,
  display_name text,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  token_expires_at timestamptz not null,
  scopes text not null default '',
  last_polled_at timestamptz,
  last_track_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One Spotify connection per user
create unique index idx_spotify_connections_user_id
  on public.spotify_connections(user_id);

-- Prevent same Spotify account linked to multiple users
create unique index idx_spotify_connections_spotify_user_id
  on public.spotify_connections(spotify_user_id);

-- For cron: find connections that need polling
create index idx_spotify_connections_polling
  on public.spotify_connections(last_polled_at);

-- RLS: service-role only (no public policies)
alter table public.spotify_connections enable row level security;

-- Updated-at trigger
create trigger spotify_connections_updated_at
  before update on public.spotify_connections
  for each row
  execute function update_updated_at();
