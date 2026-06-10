-- Run this in Supabase Dashboard → SQL Editor → New query → Run

create table if not exists folders (
  id text primary key,
  name text not null,
  color text not null default '#6366f1',
  icon text not null default '📁',
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id text primary key,
  content text not null,
  folder_ids text[] not null default '{}',
  source text not null default 'text' check (source in ('text', 'voice')),
  amount numeric,
  expense_category text,
  recorded_at timestamptz,
  todos jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_created_at_idx on notes (created_at desc);
create index if not exists notes_folder_ids_idx on notes using gin (folder_ids);
