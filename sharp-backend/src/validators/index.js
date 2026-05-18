const { z } = require('zod');

// ── Auth ──────────────────────────────────────────────────────────
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username max 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Picks ─────────────────────────────────────────────────────────
const pickSchema = z.object({
  fight_id: z.number().int().positive('Invalid fight ID'),
  fighter_selection: z.enum(['fighter1', 'fighter2'], {
    errorMap: () => ({ message: 'fighter_selection must be fighter1 or fighter2' }),
  }),
  pick_type: z.enum(['ml', 'ko', 'dec', 'r1', 'r2', 'r3'], {
    errorMap: () => ({ message: 'Invalid pick type' }),
  }),
});

// ── Validate middleware factory ───────────────────────────────────
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signupSchema,
  loginSchema,
  pickSchema,
  validate,
};