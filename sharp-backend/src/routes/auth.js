const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { validate, signupSchema, loginSchema } = require('../validators');
const { query } = require('../db/pool');
const { createError } = require('../middleware/errorHandler');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// POST /api/auth/signup
router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    // Check username not taken
    const existing = await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existing.rows.length > 0) {
      throw createError('Username already taken', 409);
    }

    // Create Supabase auth user
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw createError(error.message, 400);

    const userId = data.user.id;

    // Create app user row
    await query(
      `INSERT INTO users (id, email, username) VALUES ($1, $2, $3)`,
      [userId, email, username]
    );

    res.status(201).json({
      message: 'Account created. Please verify your email before logging in.',
      user: { id: userId, email, username },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw createError('Invalid email or password', 401);

    // Fetch app user data
    const result = await query(
      `SELECT id, email, username, points, total_picks, correct_picks,
              current_streak, best_streak, is_pro
       FROM users WHERE id = $1`,
      [data.user.id]
    );

    res.json({
      token: data.session.access_token,
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    await supabase.auth.signOut();
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;