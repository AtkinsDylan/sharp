// One-off backfill: fills fighter1/2_espn_id and fighter1/2_image on
// existing `fights` rows whose event date falls outside the regular
// forward-looking sync window, by querying ESPN for that specific
// historical date range. Matches rows by their existing api_sports_id —
// never touches rows with a null api_sports_id (no ESPN id to match by).
require('dotenv').config();
const axios = require('axios');
const { query } = require('../db/pool');

const espn = axios.create({
  baseURL: 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc',
});

async function backfillRange(startDate, endDate) {
  const fmt = (d) => d.replace(/-/g, '');
  const dates = `${fmt(startDate)}-${fmt(endDate)}`;
  console.log(`[backfill] Fetching ESPN scoreboard for ${dates}...`);

  const { data } = await espn.get('/scoreboard', { params: { dates } });

  const byCompetitionId = new Map();
  for (const event of data.events || []) {
    for (const comp of event.competitions || []) {
      byCompetitionId.set(String(comp.id), comp);
    }
  }
  console.log(`[backfill] ESPN returned ${byCompetitionId.size} competitions in range`);

  const existing = await query(`
    SELECT id, api_sports_id FROM fights
    WHERE api_sports_id IS NOT NULL
      AND (fighter1_image IS NULL OR fighter2_image IS NULL)
  `);

  let updated = 0;
  for (const row of existing.rows) {
    const comp = byCompetitionId.get(String(row.api_sports_id));
    if (!comp) continue;

    const fighter1 = comp.competitors?.find((c) => c.order === 1);
    const fighter2 = comp.competitors?.find((c) => c.order === 2);
    if (!fighter1 || !fighter2) continue;

    const fighter1Image = fighter1.athlete?.headshot?.href
      || `https://a.espncdn.com/i/headshots/mma/players/full/${fighter1.id}.png`;
    const fighter2Image = fighter2.athlete?.headshot?.href
      || `https://a.espncdn.com/i/headshots/mma/players/full/${fighter2.id}.png`;

    await query(`
      UPDATE fights
      SET fighter1_espn_id = $1, fighter1_image = $2,
          fighter2_espn_id = $3, fighter2_image = $4
      WHERE id = $5
    `, [fighter1.id, fighter1Image, fighter2.id, fighter2Image, row.id]);

    updated++;
  }

  console.log(`[backfill] Updated ${updated} fight row(s)`);
}

async function main() {
  const ranges = process.argv.slice(2);
  if (!ranges.length) {
    console.error('Usage: node backfillFighterPhotos.js <start:YYYY-MM-DD> <end:YYYY-MM-DD>');
    process.exit(1);
  }
  try {
    await backfillRange(ranges[0], ranges[1]);
  } catch (err) {
    console.error('[backfill] Error:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
