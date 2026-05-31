-- Weekly GP leaderboard and game mayorship tracking

CREATE TABLE IF NOT EXISTS weekly_gp_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gp_amount   INT NOT NULL CHECK (gp_amount > 0),
  action_type TEXT NOT NULL,
  week_start  DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weekly_gp_log_week_total_idx
  ON weekly_gp_log (week_start, user_id);

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS game_affinity_counts JSONB NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION get_weekly_leaderboard(target_week_start DATE DEFAULT NULL)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  total_gp BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH totals AS (
    SELECT
      w.user_id,
      SUM(w.gp_amount)::BIGINT AS total_gp
    FROM weekly_gp_log w
    WHERE w.week_start = COALESCE(target_week_start, (date_trunc('week', now() AT TIME ZONE 'UTC'))::DATE)
    GROUP BY w.user_id
  )
  SELECT
    RANK() OVER (ORDER BY totals.total_gp DESC, totals.user_id) AS rank,
    totals.user_id,
    COALESCE(
      NULLIF(auth.users.raw_user_meta_data->>'display_name', ''),
      NULLIF(auth.users.raw_user_meta_data->>'name', ''),
      NULLIF(split_part(auth.users.email, '@', 1), ''),
      'Player'
    ) AS display_name,
    totals.total_gp
  FROM totals
  JOIN auth.users ON auth.users.id = totals.user_id
  ORDER BY totals.total_gp DESC, totals.user_id
  LIMIT 10;
$$;
