-- ROAR engagement owned by GamerClock accounts.

CREATE TABLE IF NOT EXISTS roar_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     TEXT,
  match_id      TEXT NOT NULL,
  match_title   TEXT NOT NULL,
  team_selected TEXT,
  source        TEXT DEFAULT 'direct',
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_seen_at  TIMESTAMPTZ DEFAULT now(),
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS roar_cheers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id   TEXT,
  match_id    TEXT NOT NULL,
  match_title TEXT NOT NULL,
  team        TEXT NOT NULL,
  taps        INT NOT NULL DEFAULT 0 CHECK (taps >= 0),
  score_delta INT NOT NULL DEFAULT 0 CHECK (score_delta >= 0),
  source      TEXT DEFAULT 'direct',
  created_at  TIMESTAMPTZ DEFAULT now(),
  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS roar_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id    TEXT NOT NULL,
  match_title TEXT NOT NULL,
  team        TEXT NOT NULL,
  score       INT NOT NULL DEFAULT 0 CHECK (score >= 0),
  rank_label  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS roar_sessions_match_idx ON roar_sessions(match_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS roar_sessions_user_idx ON roar_sessions(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS roar_sessions_device_idx ON roar_sessions(device_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS roar_cheers_match_team_idx ON roar_cheers(match_id, team);
CREATE INDEX IF NOT EXISTS roar_scores_match_score_idx ON roar_scores(match_id, score DESC, updated_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS roar_sessions_user_match_unique
  ON roar_sessions(user_id, match_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS roar_sessions_device_match_unique
  ON roar_sessions(device_id, match_id)
  WHERE user_id IS NULL AND device_id IS NOT NULL;

ALTER TABLE roar_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roar_cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE roar_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "roar_sessions_service_only" ON roar_sessions;
CREATE POLICY "roar_sessions_service_only"
  ON roar_sessions
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "roar_cheers_service_only" ON roar_cheers;
CREATE POLICY "roar_cheers_service_only"
  ON roar_cheers
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "roar_scores_service_only" ON roar_scores;
CREATE POLICY "roar_scores_service_only"
  ON roar_scores
  USING (false)
  WITH CHECK (false);
