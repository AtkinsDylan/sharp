import { useEffect, useState } from 'react';
import { getPicks } from '../services/api';

function fmtOdds(o) {
  return o > 0 ? `+${o}` : `${o}`;
}

export default function Pending() {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPicks('pending')
      .then((res) => setPicks(res.data.picks))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.empty}>Loading...</div>;

  if (!picks.length) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🥊</div>
        <div>No pending picks — head to Picks to make your selections</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.pageTitle}>
        Pending <span style={styles.red}>Picks</span>
      </div>
      <div style={styles.subtitle}>
        These picks will be resolved automatically when fight results come in
      </div>

      {picks.map((pick) => (
        <div key={pick.id} style={styles.pickCard}>
          <div style={styles.pickLeft}>
            <div style={styles.fighterName}>{pick.fighter_name}</div>
            <div style={styles.pickMeta}>
              {pick.fighter1_name} vs {pick.fighter2_name}
            </div>
            <div style={styles.pickMeta}>
              {pick.event_name} · {pick.pick_type.toUpperCase()}
            </div>
          </div>
          <div style={styles.pickRight}>
            <div style={styles.odds}>{fmtOdds(pick.odds_at_pick)}</div>
            <div style={styles.pendingBadge}>PENDING</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  page: { padding: '1.5rem 2rem', maxWidth: '860px', margin: '0 auto' },
  pageTitle: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '2rem', fontWeight: 800,
    letterSpacing: '0.04em', marginBottom: '0.25rem',
    color: '#F0F0F0',
  },
  red: { color: '#E8192C' },
  subtitle: { fontSize: '13px', color: '#8A8F9E', marginBottom: '1.5rem' },
  pickCard: {
    background: '#18191D',
    border: '1px solid #2A2C32',
    borderLeft: '3px solid #3B82F6',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickLeft: { display: 'flex', flexDirection: 'column', gap: '3px' },
  fighterName: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1.05rem', fontWeight: 700, color: '#F0F0F0',
  },
  pickMeta: { fontSize: '11px', color: '#8A8F9E' },
  pickRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  odds: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1.1rem', fontWeight: 800, color: '#F5A623',
  },
  pendingBadge: {
    fontSize: '10px', fontWeight: 700,
    fontFamily: "'Barlow Condensed', sans-serif",
    letterSpacing: '0.06em',
    padding: '2px 8px', borderRadius: '3px',
    background: '#3B82F622', color: '#3B82F6',
  },
  empty: {
    textAlign: 'center', padding: '4rem',
    color: '#8A8F9E', fontSize: '14px',
  },
  emptyIcon: { fontSize: '2rem', marginBottom: '1rem' },
};