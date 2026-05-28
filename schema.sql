CREATE TABLE games (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  icon_url     TEXT,
  brand_color  TEXT DEFAULT '#6366f1',
  platform     TEXT[] DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  event_type   TEXT NOT NULL CHECK (event_type IN (
                 'weekly_reset','season_start','season_end','live_event',
                 'limited_reward','patch_release','tournament','ranked_reset',
                 'banner_end','double_xp','maintenance','new_content','other'
               )),
  importance   TEXT DEFAULT 'normal' CHECK (importance IN ('critical','high','normal','low')),
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT false,
  rrule        TEXT,
  source_url   TEXT,
  image_url    TEXT,
  reward_type  TEXT CHECK (reward_type IS NULL OR reward_type IN (
                 'skin','currency','xp_boost','item','character','banner',
                 'raid_drop','login_bonus','tournament_prize','progression',
                 'content','none'
               )),
  reward_summary TEXT,
  reward_rarity TEXT CHECK (reward_rarity IS NULL OR reward_rarity IN (
                 'common','limited','premium','time_limited'
               )),
  reward_score INTEGER DEFAULT 0 CHECK (reward_score >= 0 AND reward_score <= 100),
  is_time_limited_reward BOOLEAN DEFAULT false,
  source_confidence TEXT CHECK (source_confidence IS NULL OR source_confidence IN (
                 'official','media','inferred'
               )),
  is_published BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEW RELEASES (Switch + Steam)
-- ============================================================
CREATE TABLE new_releases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  developer     TEXT,
  platform      TEXT[] NOT NULL,
  release_date  DATE NOT NULL,
  description   TEXT,
  image_url     TEXT,
  hero_color    TEXT,
  steam_url     TEXT,
  nintendo_url  TEXT,
  is_featured   BOOLEAN DEFAULT false,
  is_published  BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RELEASE CANDIDATES (crawler queue before admin approval)
-- ============================================================
CREATE TABLE release_candidates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                TEXT NOT NULL,
  developer            TEXT,
  platforms            TEXT[] NOT NULL DEFAULT '{}',
  release_date          DATE,
  release_date_precision TEXT NOT NULL DEFAULT 'unknown'
    CHECK (release_date_precision IN ('exact','month','quarter','year','unknown')),
  description          TEXT,
  image_url            TEXT,
  source               TEXT NOT NULL,
  source_url           TEXT NOT NULL,
  external_id          TEXT,
  confidence_score     INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  signals              JSONB NOT NULL DEFAULT '{}',
  raw_payload          JSONB NOT NULL DEFAULT '{}',
  status               TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  reviewed_at          TIMESTAMPTZ,
  approved_release_id  UUID REFERENCES new_releases(id) ON DELETE SET NULL,
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, external_id)
);

-- ============================================================
-- USERS (Supabase Auth 연동)
-- ============================================================
CREATE TABLE user_preferences (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone          TEXT DEFAULT 'America/New_York',
  secondary_timezone TEXT,
  timezone_label    TEXT DEFAULT 'Home',
  language          TEXT DEFAULT 'en',
  date_format       TEXT DEFAULT 'MM/DD/YYYY',
  time_format       TEXT DEFAULT '12h',
  week_starts_on    INTEGER DEFAULT 0,
  show_weekends     BOOLEAN DEFAULT true,
  selected_games    TEXT[] DEFAULT ARRAY['fortnite','wow','pokemon-go','genshin','lol'],
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS (익명 ICS 구독 트래킹)
-- ============================================================
CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID REFERENCES games(id),
  platform      TEXT,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_events_game_id  ON events(game_id);
CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_published ON events(is_published);
CREATE INDEX idx_events_reward_score ON events(reward_score DESC, start_at);
CREATE INDEX idx_release_candidates_status_score ON release_candidates(status, confidence_score DESC, last_seen_at DESC);
CREATE INDEX idx_release_candidates_release_date ON release_candidates(release_date);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE games             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE new_releases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_games"    ON games         FOR SELECT USING (is_active = true);
CREATE POLICY "public_read_events"   ON events        FOR SELECT USING (is_published = true);
CREATE POLICY "public_read_releases" ON new_releases  FOR SELECT USING (is_published = true);
CREATE POLICY "release_candidates_service_only" ON release_candidates FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "users_own_prefs"      ON user_preferences FOR ALL USING (auth.uid() = id);
CREATE POLICY "public_insert_subs"   ON subscriptions FOR INSERT WITH CHECK (true);

-- ============================================================
-- SEED: GAMES
-- ============================================================
INSERT INTO games (slug, name, brand_color, platform, sort_order) VALUES
('fortnite',   'Fortnite',          '#00d4ff', ARRAY['PC','PS5','Xbox','Mobile','Switch'], 1),
('wow',        'World of Warcraft', '#f59e0b', ARRAY['PC'], 2),
('pokemon-go', 'Pokémon GO',        '#ffcc00', ARRAY['Mobile'], 3),
('genshin',    'Genshin Impact',    '#4ade80', ARRAY['PC','PS5','Mobile'], 4),
('lol',        'League of Legends', '#c89b3c', ARRAY['PC'], 5);

-- ============================================================
-- SEED: EVENTS (May 25 – July 30, 2026)
-- ============================================================

-- === FORTNITE ===
INSERT INTO events (game_id, title, event_type, importance, start_at, end_at, source_url) VALUES
-- 주간 퀘스트 (매주 목요일)
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-05-28 09:00:00+00', '2026-06-04 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-06-04 09:00:00+00', '2026-06-11 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-06-11 09:00:00+00', '2026-06-18 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-06-18 09:00:00+00', '2026-06-25 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-06-25 09:00:00+00', '2026-07-02 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-07-02 09:00:00+00', '2026-07-09 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-07-09 09:00:00+00', '2026-07-16 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-07-16 09:00:00+00', '2026-07-23 08:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-07-23 09:00:00+00', '2026-07-30 08:59:00+00', 'https://fortnite.com'),
-- 시즌 이벤트
((SELECT id FROM games WHERE slug='fortnite'), 'Fortnite Season End', 'season_end', 'critical', '2026-06-13 02:00:00+00', '2026-06-13 02:00:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'New Season Begins', 'season_start', 'critical', '2026-06-14 09:00:00+00', NULL, 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Battle Pass Ends', 'season_end', 'critical', '2026-06-13 02:00:00+00', NULL, 'https://fortnite.com'),
-- 특별 이벤트
((SELECT id FROM games WHERE slug='fortnite'), 'Summer Splash Event', 'live_event', 'high', '2026-06-20 00:00:00+00', '2026-07-10 23:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Independence Day Event', 'live_event', 'high', '2026-07-01 00:00:00+00', '2026-07-07 23:59:00+00', 'https://fortnite.com'),
((SELECT id FROM games WHERE slug='fortnite'), 'Item Shop Rotation', 'other', 'normal', '2026-05-25 00:00:00+00', NULL, 'https://fortnite.com'),

-- === WORLD OF WARCRAFT ===
-- 주간 리셋 (매주 화요일 15:00 UTC)
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-05-26 15:00:00+00', '2026-06-02 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-02 15:00:00+00', '2026-06-09 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-09 15:00:00+00', '2026-06-16 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-16 15:00:00+00', '2026-06-23 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-23 15:00:00+00', '2026-06-30 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-06-30 15:00:00+00', '2026-07-07 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-07-07 15:00:00+00', '2026-07-14 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-07-14 15:00:00+00', '2026-07-21 14:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Weekly Reset', 'weekly_reset', 'high', '2026-07-21 15:00:00+00', '2026-07-28 14:59:00+00', 'https://worldofwarcraft.com'),
-- 시즌 이벤트
((SELECT id FROM games WHERE slug='wow'), 'Midsummer Fire Festival', 'live_event', 'high', '2026-06-21 10:00:00+00', '2026-07-05 23:59:00+00', 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'Mythic+ Season 4 End', 'season_end', 'critical', '2026-07-14 15:00:00+00', NULL, 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'PvP Season Reset', 'ranked_reset', 'high', '2026-06-16 15:00:00+00', NULL, 'https://worldofwarcraft.com'),
((SELECT id FROM games WHERE slug='wow'), 'WoW Patch 11.2 Release', 'patch_release', 'critical', '2026-06-09 15:00:00+00', NULL, 'https://worldofwarcraft.com'),

-- === POKÉMON GO ===
((SELECT id FROM games WHERE slug='pokemon-go'), 'Community Day June', 'live_event', 'critical', '2026-06-21 14:00:00+00', '2026-06-21 17:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Community Day July', 'live_event', 'critical', '2026-07-19 14:00:00+00', '2026-07-19 17:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — June Week 1', 'tournament', 'high', '2026-06-03 18:00:00+00', '2026-06-03 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — June Week 2', 'tournament', 'high', '2026-06-10 18:00:00+00', '2026-06-10 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — June Week 3', 'tournament', 'high', '2026-06-17 18:00:00+00', '2026-06-17 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — June Week 4', 'tournament', 'high', '2026-06-24 18:00:00+00', '2026-06-24 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — July Week 1', 'tournament', 'high', '2026-07-01 18:00:00+00', '2026-07-01 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — July Week 2', 'tournament', 'high', '2026-07-08 18:00:00+00', '2026-07-08 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Raid Hour — July Week 3', 'tournament', 'high', '2026-07-15 18:00:00+00', '2026-07-15 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'GO Season: Timeless Travels End', 'season_end', 'critical', '2026-06-01 10:00:00+00', NULL, 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Spotlight Hour — June Week 1', 'limited_reward', 'normal', '2026-06-02 18:00:00+00', '2026-06-02 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Spotlight Hour — June Week 2', 'limited_reward', 'normal', '2026-06-09 18:00:00+00', '2026-06-09 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'Spotlight Hour — June Week 3', 'limited_reward', 'normal', '2026-06-16 18:00:00+00', '2026-06-16 19:00:00+00', 'https://pokemongolive.com'),
((SELECT id FROM games WHERE slug='pokemon-go'), 'GO Fest 2026', 'live_event', 'critical', '2026-07-11 10:00:00+00', '2026-07-12 20:00:00+00', 'https://pokemongolive.com'),

-- === GENSHIN IMPACT ===
((SELECT id FROM games WHERE slug='genshin'), 'Version 5.7 Update', 'new_content', 'critical', '2026-05-28 06:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Version 5.7 — Phase 2 Banner', 'banner_end', 'critical', '2026-06-10 18:00:00+00', '2026-06-10 18:00:00+00', 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Version 5.7 End / 5.8 Start', 'season_end', 'critical', '2026-07-08 06:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Version 5.8 Phase 1 Banner End', 'banner_end', 'critical', '2026-07-22 18:00:00+00', '2026-07-22 18:00:00+00', 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Spiral Abyss Reset', 'weekly_reset', 'normal', '2026-06-01 04:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Spiral Abyss Reset', 'weekly_reset', 'normal', '2026-06-16 04:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Spiral Abyss Reset', 'weekly_reset', 'normal', '2026-07-01 04:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Spiral Abyss Reset', 'weekly_reset', 'normal', '2026-07-16 04:00:00+00', NULL, 'https://genshin.hoyoverse.com'),
((SELECT id FROM games WHERE slug='genshin'), 'Summer Event 2026', 'live_event', 'high', '2026-06-15 00:00:00+00', '2026-07-07 23:59:00+00', 'https://genshin.hoyoverse.com'),

-- === LEAGUE OF LEGENDS ===
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.11 — Balance Update', 'patch_release', 'high', '2026-05-27 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.12 — Balance Update', 'patch_release', 'high', '2026-06-10 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.13 — Balance Update', 'patch_release', 'high', '2026-06-24 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.14 — Balance Update', 'patch_release', 'high', '2026-07-08 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Patch 16.15 — Balance Update', 'patch_release', 'high', '2026-07-22 14:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Split 2 End — Ranked Reset', 'season_end', 'critical', '2026-07-14 00:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'Split 3 Start', 'season_start', 'critical', '2026-07-15 00:00:00+00', NULL, 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'MSI 2026 — Finals', 'tournament', 'critical', '2026-06-20 12:00:00+00', '2026-06-20 18:00:00+00', 'https://lolesports.com'),
((SELECT id FROM games WHERE slug='lol'), 'Night Market Opens', 'limited_reward', 'high', '2026-06-05 00:00:00+00', '2026-06-19 23:59:00+00', 'https://leagueoflegends.com'),
((SELECT id FROM games WHERE slug='lol'), 'LCS Summer Split — Week 1', 'tournament', 'normal', '2026-06-06 18:00:00+00', '2026-06-07 22:00:00+00', 'https://lolesports.com');
