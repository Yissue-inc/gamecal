-- Candidate queue for upcoming game releases.
-- Crawlers write here first; admins approve into public new_releases.

CREATE TABLE IF NOT EXISTS release_candidates (
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

CREATE INDEX IF NOT EXISTS idx_release_candidates_status_score
  ON release_candidates(status, confidence_score DESC, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_release_candidates_release_date
  ON release_candidates(release_date);

ALTER TABLE release_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "release_candidates_service_only" ON release_candidates;
CREATE POLICY "release_candidates_service_only"
  ON release_candidates
  USING (false)
  WITH CHECK (false);
