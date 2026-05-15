const express = require('express');
const { query } = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/fights/events — list all upcoming events
router.get('/events', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, name, date, status
      FROM events
      ORDER BY date ASC
      LIMIT 10
    `);
    res.json({ events: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/fights/events/:eventId — get fights for a specific event
router.get('/events/:eventId', optionalAuth, async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const eventResult = await query(
      'SELECT * FROM events WHERE id = $1',
      [parseInt(eventId)]
    );
    if (!eventResult.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const fightsResult = await query(`
      SELECT
        id, fighter1_name, fighter1_record, fighter1_odds,
        fighter2_name, fighter2_record, fighter2_odds,
        weight_class, card_position, status, winner, method
      FROM fights
      WHERE event_id = $1
      ORDER BY
        CASE card_position
          WHEN 'Main Card' THEN 1
          WHEN 'Co-Main' THEN 2
          WHEN 'Prelims' THEN 3
          ELSE 4
        END, id ASC
    `, [parseInt(eventId)]);

    res.json({
      event: eventResult.rows[0],
      fights: fightsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/fights/:fightId — single fight detail
router.get('/:fightId', optionalAuth, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM fights WHERE id = $1',
      [parseInt(req.params.fightId)]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Fight not found' });
    }
    res.json({ fight: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;