const axios = require('axios');
const { query } = require('../db/pool');

const client = axios.create({
  baseURL: process.env.API_SPORTS_BASE_URL,
  headers: {
    'x-apisports-key': process.env.API_SPORTS_KEY,
  },
});

// ── Sync upcoming events into DB ─────────────────────────────────
async function syncUpcomingEvents() {
  try {
    console.log('[apiSports] Fetching upcoming MMA events...');
    const { data } = await client.get('/events', {
      params: { next: 10 },
    });

    if (!data.response?.length) {
      console.log('[apiSports] No upcoming events found');
      return;
    }

    for (const event of data.response) {
      // Upsert event
      const eventResult = await query(`
        INSERT INTO events (api_sports_id, name, date, status)
        VALUES ($1, $2, $3, 'upcoming')
        ON CONFLICT (api_sports_id) DO UPDATE
          SET name = EXCLUDED.name,
              date = EXCLUDED.date
        RETURNING id
      `, [
        event.id,
        event.name,
        event.date,
      ]);

      const eventId = eventResult.rows[0].id;

      // Upsert fights for this event
      if (event.fights?.length) {
        for (const fight of event.fights) {
          await query(`
            INSERT INTO fights (
              api_sports_id, event_id,
              fighter1_name, fighter1_odds,
              fighter2_name, fighter2_odds,
              weight_class, card_position, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
            ON CONFLICT (api_sports_id) DO UPDATE
              SET fighter1_odds = EXCLUDED.fighter1_odds,
                  fighter2_odds = EXCLUDED.fighter2_odds,
                  status = EXCLUDED.status
          `, [
            fight.id,
            eventId,
            fight.fighters?.home?.name || 'TBA',
            fight.fighters?.home?.odds || null,
            fight.fighters?.away?.name || 'TBA',
            fight.fighters?.away?.odds || null,
            fight.weight_class || null,
            fight.position || 'Prelims',
          ]);
        }
      }
    }

    console.log('[apiSports] Upcoming events synced');
  } catch (err) {
    console.error('[apiSports] syncUpcomingEvents error:', err.message);
  }
}

// ── Sync results and resolve picks ───────────────────────────────
async function syncResultsAndResolvePicks() {
  try {
    console.log('[apiSports] Checking fight results...');

    // Get fights that are still scheduled but event date has passed
    const pendingFights = await query(`
      SELECT f.id, f.api_sports_id
      FROM fights f
      JOIN events e ON e.id = f.event_id
      WHERE f.status = 'scheduled'
        AND e.date <= NOW()
      LIMIT 20
    `);

    if (!pendingFights.rows.length) {
      console.log('[apiSports] No pending fights to resolve');
      return;
    }

    for (const fight of pendingFights.rows) {
      const { data } = await client.get(`/fights/${fight.api_sports_id}`);
      const result = data.response?.[0];

      if (!result || result.status !== 'finished') continue;

      const winner = result.winner?.name || null;
      const method = result.method || null;

      // Update fight result
      await query(`
        UPDATE fights
        SET status = 'completed', winner = $1, method = $2, updated_at = NOW()
        WHERE id = $3
      `, [winner, method, fight.id]);

      // Resolve picks for this fight
      const picks = await query(`
        SELECT id, user_id, fighter_name
        FROM picks
        WHERE fight_id = $1 AND status = 'pending'
      `, [fight.id]);

      for (const pick of picks.rows) {
        const correct = pick.fighter_name === winner;
        const pointsEarned = correct ? 10 : 0;

        await query(`
          UPDATE picks
          SET status = $1, points_earned = $2, resolved_at = NOW()
          WHERE id = $3
        `, [correct ? 'correct' : 'incorrect', pointsEarned, pick.id]);

        if (correct) {
          await query(`
            UPDATE users
            SET points = points + $1,
                correct_picks = correct_picks + 1,
                total_picks = total_picks + 1,
                current_streak = current_streak + 1,
                best_streak = GREATEST(best_streak, current_streak + 1),
                updated_at = NOW()
            WHERE id = $2
          `, [pointsEarned, pick.user_id]);
        } else {
          await query(`
            UPDATE users
            SET total_picks = total_picks + 1,
                current_streak = 0,
                updated_at = NOW()
            WHERE id = $1
          `, [pick.user_id]);
        }
      }

      console.log(`[apiSports] Resolved fight ${fight.api_sports_id} — winner: ${winner}`);
    }

    console.log('[apiSports] Results sync complete');
  } catch (err) {
    console.error('[apiSports] syncResultsAndResolvePicks error:', err.message);
  }
}

module.exports = { syncUpcomingEvents, syncResultsAndResolvePicks };