const axios = require('axios');
const { query } = require('../db/pool');

const espn = axios.create({
  baseURL: 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc',
});

const SYNC_WINDOW_DAYS = 60;

// ── Build an ESPN "YYYYMMDD-YYYYMMDD" range covering the next N days ──
function upcomingDateRange(days = SYNC_WINDOW_DAYS) {
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  return `${fmt(start)}-${fmt(end)}`;
}

// ── Fighter headshot: prefer an inline ESPN URL, else build one ──
function fighterImageUrl(competitor) {
  const inline = competitor?.athlete?.headshot?.href;
  if (inline) return inline;
  const athleteId = competitor?.id;
  return athleteId
    ? `https://a.espncdn.com/i/headshots/mma/players/full/${athleteId}.png`
    : null;
}

// ── Sync upcoming events into DB ─────────────────────────────────
async function syncUpcomingEvents() {
  try {
    console.log('[ESPN] Fetching upcoming UFC events...');
    const { data } = await espn.get('/scoreboard', {
      params: { dates: upcomingDateRange() },
    });

    if (!data.events?.length) {
      console.log('[ESPN] No upcoming events found');
      return;
    }

    for (const event of data.events) {
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

      // Upsert fights from competitions
      if (event.competitions?.length) {
        const total = event.competitions.length;

        for (let i = 0; i < event.competitions.length; i++) {
          const fight = event.competitions[i];
          const fighter1 = fight.competitors?.find(c => c.order === 1);
          const fighter2 = fight.competitors?.find(c => c.order === 2);

          if (!fighter1 || !fighter2) continue;

          const fighter1Name = fighter1.athlete?.fullName || 'TBA';
          const fighter2Name = fighter2.athlete?.fullName || 'TBA';
          const fighter1Record = fighter1.records?.[0]?.summary || null;
          const fighter2Record = fighter2.records?.[0]?.summary || null;
          const weightClass = fight.type?.abbreviation || null;
          const fighter1EspnId = fighter1.id || null;
          const fighter2EspnId = fighter2.id || null;
          const fighter1Image = fighterImageUrl(fighter1);
          const fighter2Image = fighterImageUrl(fighter2);

          // Determine card position by index
          let cardPosition;
          if (i === total - 1) cardPosition = 'Main Event';
          else if (i === total - 2) cardPosition = 'Co-Main';
          else if (i >= total - 7) cardPosition = 'Main Card';
          else cardPosition = 'Prelims';

          await query(`
            INSERT INTO fights (
              api_sports_id, event_id,
              fighter1_name, fighter1_record, fighter1_espn_id, fighter1_image,
              fighter2_name, fighter2_record, fighter2_espn_id, fighter2_image,
              weight_class, card_position, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled')
            ON CONFLICT (api_sports_id) DO UPDATE
              SET fighter1_name = EXCLUDED.fighter1_name,
                  fighter2_name = EXCLUDED.fighter2_name,
                  fighter1_record = EXCLUDED.fighter1_record,
                  fighter2_record = EXCLUDED.fighter2_record,
                  fighter1_espn_id = EXCLUDED.fighter1_espn_id,
                  fighter2_espn_id = EXCLUDED.fighter2_espn_id,
                  fighter1_image = EXCLUDED.fighter1_image,
                  fighter2_image = EXCLUDED.fighter2_image,
                  card_position = EXCLUDED.card_position,
                  status = EXCLUDED.status
          `, [
            fight.id,
            eventId,
            fighter1Name,
            fighter1Record,
            fighter1EspnId,
            fighter1Image,
            fighter2Name,
            fighter2Record,
            fighter2EspnId,
            fighter2Image,
            weightClass,
            cardPosition,
          ]);
        }
      }
    }

    console.log('[ESPN] Upcoming events synced');
  } catch (err) {
    console.error('[ESPN] syncUpcomingEvents error:', err.message);
  }
}

// ── Sync results and resolve picks ───────────────────────────────
async function syncResultsAndResolvePicks() {
  try {
    console.log('[ESPN] Checking fight results...');

    const pendingFights = await query(`
      SELECT f.id, f.api_sports_id
      FROM fights f
      JOIN events e ON e.id = f.event_id
      WHERE f.status = 'scheduled'
        AND e.date <= NOW()
      LIMIT 20
    `);

    if (!pendingFights.rows.length) {
      console.log('[ESPN] No pending fights to resolve');
      return;
    }

    // Fetch latest scoreboard to check results
    const { data } = await espn.get('/scoreboard');

    for (const fight of pendingFights.rows) {
      // Find this fight in ESPN competitions
      let result = null;
      for (const event of data.events || []) {
        const comp = event.competitions?.find(c => c.id === fight.api_sports_id);
        if (comp) { result = comp; break; }
      }

      if (!result || !result.status?.type?.completed) continue;

      const winnerComp = result.competitors?.find(c => c.winner === true);
      const winner = winnerComp?.athlete?.fullName || null;

      // Update fight result
      await query(`
        UPDATE fights
        SET status = 'completed', winner = $1, updated_at = NOW()
        WHERE id = $2
      `, [winner, fight.id]);

      // Resolve picks
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

      console.log(`[ESPN] Resolved fight ${fight.api_sports_id} — winner: ${winner}`);
    }

    console.log('[ESPN] Results sync complete');
  } catch (err) {
    console.error('[ESPN] syncResultsAndResolvePicks error:', err.message);
  }
}

module.exports = { syncUpcomingEvents, syncResultsAndResolvePicks };