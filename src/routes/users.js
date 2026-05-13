const express = require('express');
const { query } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me — current user profile and stats
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
        id, email, username, points, total_picks, correct_picks,
        current_streak, best_streak, is_pro, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me — update username
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check not taken by someone else
    const existing = await query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, req.user.id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const result = await query(
      `UPDATE users
       SET username = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, username, points, total_picks,
                 correct_picks, current_streak, best_streak, is_pro`,
      [username, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;