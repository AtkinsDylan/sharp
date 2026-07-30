const express = require('express');
const { syncUpcomingEvents } = require('../services/apiSports');
const router = express.Router();

const requireAdminKey = (req, res, next) => {
  if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(404).json({ error: 'Route not found' });
  }
  next();
};

router.post('/sync', requireAdminKey, async (req, res) => {
  await syncUpcomingEvents();
  res.json({ message: 'Sync triggered' });
});

module.exports = router;