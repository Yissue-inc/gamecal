-- Public UI flags controlled from the admin panel.

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (key, value)
VALUES (
  'public_ui',
  '{"show_cinematic_intro": true, "show_signup_onboarding": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_service_only" ON site_settings;
CREATE POLICY "site_settings_service_only"
  ON site_settings
  USING (false)
  WITH CHECK (false);
