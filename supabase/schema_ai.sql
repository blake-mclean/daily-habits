-- AI Coaching tables
-- Run this in the Supabase Dashboard SQL editor

create table if not exists public.ai_coaching_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  context_data jsonb,
  created_at timestamptz default now() not null
);

create table if not exists public.ai_reflections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  period text not null check (period in ('weekly', 'monthly')),
  period_start date not null,
  summary text not null,
  stats_data jsonb,
  created_at timestamptz default now() not null
);

alter table public.ai_coaching_messages enable row level security;
alter table public.ai_reflections enable row level security;

create policy "Users can read own coaching messages"
  on public.ai_coaching_messages for select
  using (auth.uid() = user_id);

create policy "Users can read own reflections"
  on public.ai_reflections for select
  using (auth.uid() = user_id);

-- Index for fast lookups by user + time
create index if not exists ai_coaching_messages_user_created
  on public.ai_coaching_messages (user_id, created_at desc);

create index if not exists ai_reflections_user_period
  on public.ai_reflections (user_id, period, created_at desc);
