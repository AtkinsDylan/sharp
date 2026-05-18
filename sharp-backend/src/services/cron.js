const cron = require('node-cron');
const { syncUpcomingEvents, syncResultsAndResolvePicks } = require('./apiSports');

function startCronJobs() {
  console.log('[Cron] Starting scheduled jobs...');

  // Sync upcoming fight cards every day at 6am UTC
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Daily fight card sync');
    await syncUpcomingEvents();
  });

  // Check for fight results every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Cron] Checking fight results...');
    await syncResultsAndResolvePicks();
  });

  console.log('[Cron] Jobs registered');
}

module.exports = { startCronJobs };