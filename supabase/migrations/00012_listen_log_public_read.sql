-- Allow public reads on listen_log (profile pages show recent tracks & top artists)
create policy "Listen log is publicly readable"
  on public.listen_log for select
  using (true);
