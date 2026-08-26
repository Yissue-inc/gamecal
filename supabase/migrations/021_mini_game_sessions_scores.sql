-- 021 — 범용 미니게임 세션/점수
-- 핸드오프 §10. ROAR 테이블에 얹지 않고 별도로 만든다.
-- 이벤트가 없는 게임도 유일 제약이 걸리도록 event_scope 를 쓴다 ('global').

create table if not exists mini_game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id text,
  mini_game_slug text not null,
  event_id text,
  game_slug text,
  source text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists mini_game_sessions_lookup_idx
  on mini_game_sessions (mini_game_slug, event_id, game_slug);

create index if not exists mini_game_sessions_identity_idx
  on mini_game_sessions (user_id, device_id);

create table if not exists mini_game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references mini_game_sessions(id) on delete set null,
  mini_game_slug text not null,
  event_id text,
  event_scope text not null default 'global',
  game_slug text,
  score integer not null default 0,
  rank_label text,
  duration_ms integer,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mini_game_slug, event_scope)
);

create index if not exists mini_game_scores_leaderboard_idx
  on mini_game_scores (mini_game_slug, event_scope, score desc, updated_at asc);

alter table mini_game_sessions enable row level security;
alter table mini_game_scores enable row level security;

-- 세션: 본인 것만 읽는다. 쓰기는 서비스 롤(서버)만.
drop policy if exists mini_game_sessions_select_own on mini_game_sessions;
create policy mini_game_sessions_select_own on mini_game_sessions
  for select using (auth.uid() = user_id);

-- 점수: 리더보드는 누구나 읽고, 쓰기는 서버만.
drop policy if exists mini_game_scores_select_all on mini_game_scores;
create policy mini_game_scores_select_all on mini_game_scores
  for select using (true);
