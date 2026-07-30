require('dotenv').config();
const { query } = require('./pool');

async function migrate() {
  console.log('Running migrations...');

  // ── Users ─────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      points INTEGER NOT NULL DEFAULT 0,
      total_picks INTEGER NOT NULL DEFAULT 0,
      correct_picks INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      is_pro BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ── Events ────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      api_sports_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      date TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'upcoming',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ── Fights ────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS fights (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      api_sports_id INTEGER UNIQUE,
      fighter1_name TEXT NOT NULL,
      fighter1_record TEXT,
      fighter1_odds INTEGER,
      fighter1_espn_id TEXT,
      fighter1_image TEXT,
      fighter2_name TEXT NOT NULL,
      fighter2_record TEXT,
      fighter2_odds INTEGER,
      fighter2_espn_id TEXT,
      fighter2_image TEXT,
      weight_class TEXT,
      card_position TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      winner TEXT,
      method TEXT,
      round_ended INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ── Picks ─────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS picks (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fight_id INTEGER NOT NULL REFERENCES fights(id),
      fighter_selection TEXT NOT NULL,
      fighter_name TEXT NOT NULL,
      pick_type TEXT NOT NULL DEFAULT 'ml',
      odds_at_pick INTEGER NOT NULL,
      points_earned INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ── Indexes ───────────────────────────────────────────────────
  await query(`CREATE INDEX IF NOT EXISTS idx_picks_user_id ON picks(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_picks_status ON picks(status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_picks_fight_id ON picks(fight_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_fights_event_id ON fights(event_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_fights_status ON fights(status);`);

  console.log('✓ Migrations complete');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});