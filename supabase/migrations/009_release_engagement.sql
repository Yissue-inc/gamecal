-- Engagement for New Releases: wishlists, reminders, and push delivery state.

CREATE TABLE IF NOT EXISTS release_wishlists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id  UUID REFERENCES new_releases(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, release_id)
);

CREATE TABLE IF NOT EXISTS release_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id  UUID REFERENCES new_releases(id) ON DELETE CASCADE,
  remind_at   TIMESTAMPTZ NOT NULL,
  offset_min  INT NOT NULL,
  is_sent     BOOLEAN DEFAULT false,
  sent_at     TIMESTAMPTZ,
  last_error  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, release_id, offset_min)
);

CREATE INDEX IF NOT EXISTS idx_release_reminders_due
  ON release_reminders(is_sent, remind_at)
  WHERE is_sent = false;

CREATE INDEX IF NOT EXISTS idx_release_wishlists_user
  ON release_wishlists(user_id);

CREATE INDEX IF NOT EXISTS idx_release_reminders_user
  ON release_reminders(user_id);
