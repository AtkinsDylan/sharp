require('dotenv').config();
const { query } = require('./pool');

async function seed() {
  console.log('Seeding database...');

  // ── Events ────────────────────────────────────────────────────
  const eventResult = await query(`
    INSERT INTO events (name, date, status) VALUES
      ('UFC 315', '2025-05-31T22:00:00Z', 'upcoming'),
      ('UFC Fight Night', '2025-06-07T22:00:00Z', 'upcoming'),
      ('UFC 316', '2025-06-28T22:00:00Z', 'upcoming')
    ON CONFLICT DO NOTHING
    RETURNING id, name
  `);

  const events = eventResult.rows;
  if (!events.length) {
    console.log('Already seeded — skipping');
    process.exit(0);
  }

  const [ufc315, ufcFN, ufc316] = events;

  // ── UFC 315 fights ────────────────────────────────────────────
  await query(`
    INSERT INTO fights
      (event_id, fighter1_name, fighter1_record, fighter1_odds,
       fighter2_name, fighter2_record, fighter2_odds, weight_class, card_position)
    VALUES
      ($1,'Islam Makhachev','26-1',-350,'Jack Della Maddalena','16-2',280,'Lightweight Title','Main Card'),
      ($1,'Valentina Shevchenko','24-4',-180,'Manon Fiorot','12-1',155,'Women''s Flyweight','Main Card'),
      ($1,'Charles Oliveira','34-10',-145,'Renato Moicano','20-5',125,'Lightweight','Co-Main'),
      ($1,'Kevin Holland','25-10',130,'Reinier de Ridder','18-2',-150,'Middleweight','Prelims')
  `, [ufc315.id]);

  // ── UFC Fight Night fights ─────────────────────────────────────
  await query(`
    INSERT INTO fights
      (event_id, fighter1_name, fighter1_record, fighter1_odds,
       fighter2_name, fighter2_record, fighter2_odds, weight_class, card_position)
    VALUES
      ($1,'Sean O''Malley','18-2',110,'Merab Dvalishvili','18-4',-130,'Bantamweight','Main Card'),
      ($1,'Paddy Pimblett','21-3',-160,'Mateusz Gamrot','23-2',140,'Lightweight','Main Card')
  `, [ufcFN.id]);

  // ── UFC 316 fights ────────────────────────────────────────────
  await query(`
    INSERT INTO fights
      (event_id, fighter1_name, fighter1_record, fighter1_odds,
       fighter2_name, fighter2_record, fighter2_odds, weight_class, card_position)
    VALUES
      ($1,'Alex Pereira','12-2',-220,'Magomed Ankalaev','19-1',185,'Light Heavyweight Title','Main Card'),
      ($1,'Zhang Weili','25-3',-175,'Tatiana Suarez','10-0',150,'Women''s Strawweight Title','Main Card')
  `, [ufc316.id]);

  console.log('✓ Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});