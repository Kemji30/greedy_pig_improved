-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create table if not exists games (
  id uuid primary key,
  version integer not null default 0,
  status text not null default 'active',
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists match_results (
  id bigint generated always as identity primary key,
  game_id uuid not null unique references games(id) on delete cascade,
  mode text not null,
  bot_level text,
  max_points integer not null,
  winner_name text not null,
  winner_is_bot boolean not null,
  rolls integer not null,
  players jsonb not null,          -- [{ name, isBot, total }]
  player_names text[] not null,    -- lower-cased human names, for history lookups
  created_at timestamptz not null default now()
);

create index if not exists match_results_created_idx on match_results (created_at desc);
create index if not exists match_results_names_idx on match_results using gin (player_names);

-- Only the server (service role key) touches these tables.
-- Turning row level security on with no policies blocks direct browser access.
alter table games enable row level security;
alter table match_results enable row level security;
