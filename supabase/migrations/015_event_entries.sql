-- Launch event giveaway entries

CREATE TABLE IF NOT EXISTS event_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  social_url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'twitter')),
  score_at_entry NUMERIC NOT NULL,
  event_id TEXT NOT NULL,
  entered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE event_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own entries" ON event_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own entries" ON event_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON event_entries
  USING (true) WITH CHECK (true);
