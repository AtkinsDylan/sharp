require('dotenv').config();
const axios = require('axios');
const { syncResultsAndResolvePicks } = require('../services/apiSports');

async function main() {
  try {
    console.log('[resolve] Fetching raw ESPN response (no query params)...');
    const { data } = await axios.get(
      'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard'
    );
    console.log('[resolve] Raw ESPN response:');
    console.log(JSON.stringify(data, null, 2));

    console.log('[resolve] Running syncResultsAndResolvePicks()...');
    const result = await syncResultsAndResolvePicks();
    console.log('[resolve] Result:', result);
  } catch (err) {
    console.error('[resolve] Error:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
