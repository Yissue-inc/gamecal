-- Engagement: wishlists, reminders, attendance, badges
-- Note: events table is named `events` in schema (not game_events)

CREATE TABLE IF NOT EXISTS wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
  remind_at   TIMESTAMPTZ NOT NULL,
  offset_min  INT NOT NULL,
  is_sent     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id, offset_min)
);

CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (user_id, checked_at)
);

CREATE TABLE IF NOT EXISTS badge_definitions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL,
  rarity      TEXT NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  condition   JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id    TEXT REFERENCES badge_definitions(id),
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak  INT DEFAULT 0,
  longest_streak  INT DEFAULT 0,
  total_days      INT DEFAULT 0,
  last_check_in   DATE,
  prestige_level  TEXT DEFAULT 'bronze',
  gp              INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS digest_subscribers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE new_releases ADD COLUMN IF NOT EXISTS hero_color TEXT;
