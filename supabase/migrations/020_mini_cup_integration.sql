-- Mini Cup persistence merged into GamerClock's Supabase project.

CREATE TABLE IF NOT EXISTS public.mini_cup_cheer_totals (
  match_id   TEXT NOT NULL,
  country    TEXT NOT NULL,
  taps       BIGINT NOT NULL DEFAULT 0 CHECK (taps >= 0),
  shakes     BIGINT NOT NULL DEFAULT 0 CHECK (shakes >= 0),
  total      BIGINT GENERATED ALWAYS AS (taps + shakes) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, country)
);

CREATE INDEX IF NOT EXISTS mini_cup_cheer_totals_match_total_idx
  ON public.mini_cup_cheer_totals (match_id, total DESC);

ALTER TABLE public.mini_cup_cheer_totals ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.mini_cup_add_cheer(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.mini_cup_add_cheer(
  p_match_id TEXT,
  p_country TEXT,
  p_taps INTEGER,
  p_shakes INTEGER
)
RETURNS SETOF public.mini_cup_cheer_totals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_match_id TEXT := left(coalesce(nullif(trim(p_match_id), ''), 'unknown-match'), 180);
  clean_country TEXT := left(coalesce(nullif(trim(p_country), ''), 'Unknown'), 180);
BEGIN
  INSERT INTO public.mini_cup_cheer_totals AS cheer_totals (
    match_id,
    country,
    taps,
    shakes,
    updated_at
  )
  VALUES (
    clean_match_id,
    clean_country,
    greatest(0, least(500, coalesce(p_taps, 0))),
    greatest(0, least(500, coalesce(p_shakes, 0))),
    now()
  )
  ON CONFLICT ON CONSTRAINT mini_cup_cheer_totals_pkey
  DO UPDATE SET
    taps = cheer_totals.taps + excluded.taps,
    shakes = cheer_totals.shakes + excluded.shakes,
    updated_at = now();

  RETURN QUERY
  SELECT c.*
  FROM public.mini_cup_cheer_totals AS c
  WHERE c.match_id = clean_match_id;
END;
$$;

CREATE TABLE IF NOT EXISTS public.mini_cup_players (
  device_id    TEXT PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nickname     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mini_cup_players_user_idx
  ON public.mini_cup_players (user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.mini_cup_bets (
  id               TEXT PRIMARY KEY,
  device_id        TEXT NOT NULL REFERENCES public.mini_cup_players(device_id) ON DELETE CASCADE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  match_id         TEXT NOT NULL,
  match_label      TEXT NOT NULL,
  country          TEXT NOT NULL,
  pick             TEXT NOT NULL CHECK (pick IN ('team1', 'draw', 'team2')),
  pick_label       TEXT NOT NULL,
  stake            INTEGER NOT NULL CHECK (stake > 0),
  potential_return INTEGER NOT NULL CHECK (potential_return >= stake),
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  payout           INTEGER NOT NULL DEFAULT 0 CHECK (payout >= 0),
  claimed          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS mini_cup_bets_device_created_idx
  ON public.mini_cup_bets (device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS mini_cup_bets_user_created_idx
  ON public.mini_cup_bets (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mini_cup_bets_match_status_idx
  ON public.mini_cup_bets (match_id, status);

ALTER TABLE public.mini_cup_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_cup_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mini_cup_cheer_totals_service_only" ON public.mini_cup_cheer_totals;
CREATE POLICY "mini_cup_cheer_totals_service_only"
  ON public.mini_cup_cheer_totals
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "mini_cup_players_service_only" ON public.mini_cup_players;
CREATE POLICY "mini_cup_players_service_only"
  ON public.mini_cup_players
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "mini_cup_bets_service_only" ON public.mini_cup_bets;
CREATE POLICY "mini_cup_bets_service_only"
  ON public.mini_cup_bets
  USING (false)
  WITH CHECK (false);

NOTIFY pgrst, 'reload schema';
