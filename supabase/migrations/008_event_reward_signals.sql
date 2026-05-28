-- Reward signal layer for prioritizing events that players should not miss.
ALTER TABLE events ADD COLUMN IF NOT EXISTS reward_type TEXT
  CHECK (
    reward_type IS NULL OR reward_type IN (
      'skin',
      'currency',
      'xp_boost',
      'item',
      'character',
      'banner',
      'raid_drop',
      'login_bonus',
      'tournament_prize',
      'progression',
      'content',
      'none'
    )
  );

ALTER TABLE events ADD COLUMN IF NOT EXISTS reward_summary TEXT;

ALTER TABLE events ADD COLUMN IF NOT EXISTS reward_rarity TEXT
  CHECK (
    reward_rarity IS NULL OR reward_rarity IN (
      'common',
      'limited',
      'premium',
      'time_limited'
    )
  );

ALTER TABLE events ADD COLUMN IF NOT EXISTS reward_score INTEGER DEFAULT 0
  CHECK (reward_score >= 0 AND reward_score <= 100);

ALTER TABLE events ADD COLUMN IF NOT EXISTS is_time_limited_reward BOOLEAN DEFAULT false;

ALTER TABLE events ADD COLUMN IF NOT EXISTS source_confidence TEXT
  CHECK (
    source_confidence IS NULL OR source_confidence IN (
      'official',
      'media',
      'inferred'
    )
  );

CREATE INDEX IF NOT EXISTS idx_events_reward_score ON events(reward_score DESC, start_at);
