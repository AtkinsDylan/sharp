const express = require('express');
const { query } = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/leaderboard — top users by points
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { period = 'alltime' } = req.query;

    let queryText;

    if (period === 'weekly') {
      // Points earned from picks in the last 7 days
      queryText = `
        SELECT
          u.id, u.username,
          COALESCE(SUM(p.points_earned), 0) AS points,
          COUNT(p.id) AS total_picks,
          COUNT(p.id) FILTER (WHERE p.status = 'correct') AS correct_picks,
          u.current_streak, u.best_streak
        FROM users u
        LEFT JOIN picks p ON p.user_id = u.id
          AND p.created_at >= NOW() - INTERVAL '7 days'
          AND p.status = 'correct'
        GROUP BY u.id, u.username, u.current_streak, u.best_streak
        ORDER BY points DESC, correct_picks DESC
        LIMIT 50
      `;
    } else {
      // All time — use points column directly
      queryText = `
        SELECT
          id, username, points, total_picks, correct_picks,
          current_streak, best_streak
        FROM users
        ORDER BY points DESC, correct_picks DESC
        LIMIT 50
      `;
    }

    const result = await query(queryText);

    // Add rank and highlight current user if logged in
    const rows = result.rows.map((row, index) => ({
      rank: index + 1,
      ...row,
      is_me: req.user ? row.id === req.user.id : false,
    }));

    // If logged in, also find current user's rank if outside top 50
    let myRank = null;
    if (req.user) {
      const inTop50 = rows.find(r => r.is_me);
      if (!inTop50) {
        const rankResult = await query(`
          SELECT COUNT(*) + 1 AS rank
          FROM users
          WHERE points > (SELECT points FROM users WHERE id = $1)
        `, [req.user.id]);
        myRank = parseInt(rankResult.rows[0].rank);
      }
    }

    res.json({ leaderboard: rows, my_rank: myRank });
  } catch (err) {
    next(err);
  }
});

module.exports = router;