-- Create cache table
create table if not exists public.insight_threads_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  threads_data jsonb not null,
  last_updated_at timestamptz not null default now()
);

alter table public.insight_threads_cache enable row level security;

create policy if not exists "Users can manage their own thread cache"
on public.insight_threads_cache for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
