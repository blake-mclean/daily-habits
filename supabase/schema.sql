-- ============================================================
-- HabitTracker Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Habits table
create table if not exists public.habits (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text,
  type text not null default 'daily',
  target_count integer not null default 1,
  color text,
  identity_type text,
  reminder jsonb,
  created_at text,
  updated_at timestamptz default now(),
  deleted boolean not null default false
);

-- Habit logs table
create table if not exists public.habit_logs (
  habit_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  count integer not null default 1,
  primary key (habit_id, date)
);

-- Challenges table
create table if not exists public.challenges (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  duration_days integer,
  start_date text,
  completed_days text[] default '{}',
  completed boolean not null default false,
  reward_shown boolean not null default false,
  updated_at timestamptz default now()
);

-- User settings (stores misc state as a JSON blob)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ── Row Level Security ───────────────────────────────────────

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.challenges enable row level security;
alter table public.user_settings enable row level security;

-- Habits policies
create policy "habits: own rows only"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Habit logs policies
create policy "habit_logs: own rows only"
  on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Challenges policies
create policy "challenges: own rows only"
  on public.challenges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User settings policies
create policy "user_settings: own rows only"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
