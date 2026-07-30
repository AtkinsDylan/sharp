require('dotenv').config();
const axios = require('axios');
const { syncUpcomingEvents } = require('../services/apiSports');

async function main() {
  try {
    console.log('[sync] Fetching raw ESPN response (no query params)...');
    const { data } = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard'
    );
    console.log('[sync] Raw ESPN response:');
    console.log(JSON.stringify(data, null, 2));

    console.log('[sync] Running syncUpcomingEvents()...');
    const result = await syncUpcomingEvents();
    console.log('[sync] Result:', result);
  } catch (err) {
    console.error('[sync] Error:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
