const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })),
    });
  }

  // CORS errors
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  // PostgreSQL duplicate
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  // PostgreSQL foreign key
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource not found' });
  }

  // Default
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again.'
    : err.message;

  res.status(statusCode).json({ error: message });
};

const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };