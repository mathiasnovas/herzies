-- Track when each herzie last synced, so the server can cap
-- minutesListened to real elapsed wall-clock time.
alter table public.herzies
  add column if not exists last_synced_at timestamptz;
