-- Adds ESPN athlete id and headshot image URL columns to fights.
ALTER TABLE fights
  ADD COLUMN IF NOT EXISTS fighter1_espn_id TEXT,
  ADD COLUMN IF NOT EXISTS fighter2_espn_id TEXT,
  ADD COLUMN IF NOT EXISTS fighter1_image TEXT,
  ADD COLUMN IF NOT EXISTS fighter2_image TEXT;
