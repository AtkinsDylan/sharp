const express = require('express');
const { syncUpcomingEvents } = require('../services/apiSports');
const router = express.Router();

router.post('/sync', async (req, res) => {
  await syncUpcomingEvents();
  res.json({ message: 'Sync triggered' });
});

module.exports = router;