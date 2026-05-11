-- Track which song hunt first-finder notifications a user has already seen
alter table public.herzies
  add column notified_hunts text[] not null default '{}';
