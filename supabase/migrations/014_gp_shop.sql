-- GP Shop inventory effects

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS streak_freeze_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS double_gp_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_theme TEXT NOT NULL DEFAULT 'default';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_stats_active_theme_check'
  ) THEN
    ALTER TABLE user_stats
      ADD CONSTRAINT user_stats_active_theme_check
      CHECK (active_theme IN ('default', 'neon', 'gold'));
  END IF;
END $$;

INSERT INTO badge_definitions (id, name, description, icon, rarity, condition)
VALUES (
  'veteran',
  'Veteran',
  'Unlocked from the GP Shop by players who have banked serious Gamer Points.',
  '🎖',
  'legendary',
  '{"type":"shop_purchase","item_id":"veteran_badge"}'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  rarity = EXCLUDED.rarity,
  condition = EXCLUDED.condition;
