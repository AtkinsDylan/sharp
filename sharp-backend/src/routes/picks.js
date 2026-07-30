const express = require('express');
const { query, getClient } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { validate, pickSchema } = require('../validators');
const { createError } = require('../middleware/errorHandler');

const router = express.Router();

// Points calculation based on odds and pick type
const PICK_TYPE_MODIFIERS = {
  ml:  1.0,
  ko:  1.4,
  dec: 0.7,
  r1:  2.5,
  r2:  2.0,
  r3:  1.8,
};

function calcPointsForOdds(odds, pickType) {
  const mod = PICK_TYPE_MODIFIERS[pickType] || 1.0;
  let base;

  if (odds <= -300)       base = 10;  // Heavy favourite
  else if (odds <= -200)  base = 15;
  else if (odds <= -100)  base = 20;  // Slight favourite
  else if (odds <= 150)   base = 30;  // Pick em / slight underdog
  else if (odds <= 250)   base = 45;  // Underdog
  else if (odds <= 400)   base = 60;  // Big underdog
  else                    base = 80;  // Massive underdog

  return Math.round(base * mod);
}

function calcStreakMultiplier(streak) {
  if (streak >= 10) return 3.0;
  if (streak >= 7)  return 2.5;
  if (streak >= 5)  return 2.0;
  if (streak >= 3)  return 1.5;
  return 1.0;
}

// POST /api/picks — submit a pick (auth required)
router.post('/', requireAuth, validate(pickSchema), async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { fight_id, fighter_selection, pick_type } = req.body;
    const userId = req.user.id;

    // 1. Check fight exists, is still scheduled, and its event hasn't started —
    //    status alone isn't enough since it only flips once resolution has
    //    actually run for that fight, which isn't guaranteed at pick time.
    const fightResult = await client.query(`
      SELECT f.* FROM fights f
      JOIN events e ON e.id = f.event_id
      WHERE f.id = $1 AND f.status = $2 AND e.date > NOW()
    `, [fight_id, 'scheduled']);
    if (!fightResult.rows.length) {
      throw createError('Fight not found or no longer accepting picks', 404);
    }
    const fight = fightResult.rows[0];

    // 2. Check user hasn't already picked this fight
    const existingPick = await client.query(
      'SELECT id FROM picks WHERE user_id = $1 AND fight_id = $2',
      [userId, fight_id]
    );
    if (existingPick.rows.length) {
      throw createError('You have already made a pick for this fight', 409);
    }

    // 3. Get odds for selected fighter
    const baseOdds = fighter_selection === 'fighter1'
      ? fight.fighter1_odds
      : fight.fighter2_odds;
    const fighterName = fighter_selection === 'fighter1'
      ? fight.fighter1_name
      : fight.fighter2_name;

    // 4. Calculate potential points
    const potentialPoints = calcPointsForOdds(baseOdds, pick_type);

    // 5. Save the pick
    const pickResult = await client.query(`
      INSERT INTO picks
        (user_id, fight_id, fighter_selection, fighter_name, pick_type, odds_at_pick)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, fight_id, fighter_selection, fighterName, pick_type, baseOdds]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Pick submitted successfully',
      pick: pickResult.rows[0],
      potential_points: potentialPoints,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/picks — get current user's picks (auth required)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.query;

    let queryText = `
      SELECT
        p.*,
        f.fighter1_name, f.fighter2_name,
        f.weight_class, f.card_position,
        e.name as event_name, e.date as event_date
      FROM picks p
      JOIN fights f ON p.fight_id = f.id
      JOIN events e ON f.event_id = e.id
      WHERE p.user_id = $1
    `;
    const params = [req.user.id];

    if (status) {
      params.push(status);
      queryText += ` AND p.status = $${params.length}`;
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT 50`;

    const result = await query(queryText, params);
    res.json({ picks: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/picks/stats — current user's stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
        points, total_picks, correct_picks,
        current_streak, best_streak
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const accuracy = user.total_picks > 0
      ? ((user.correct_picks / user.total_picks) * 100).toFixed(1)
      : '0.0';

    res.json({
      stats: {
        ...user,
        accuracy,
        streak_multiplier: calcStreakMultiplier(user.current_streak),
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;