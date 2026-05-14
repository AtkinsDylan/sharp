import { useEffect, useState } from 'react';
import { getPicks, getPickStats } from '../services/api';

function fmtOdds(o) {
  return o > 0 ? `+${o}` : `${o}`;
}

export default function History() {
  const [picks, setPicks] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPicks(),
      getPickStats(),
    ])
      .then(([picksRes, statsRes]) => {
        setPicks(picksRes.data.picks.filter((p) => p.status !== 'pending'));
        setStats(statsRes.data.stats);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? picks
    : picks.filter((p) => p.status === filter);

  if (loading) return <div style={styles.empty}>Loading...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.pageTitle}>
        Pick <span style={styles.red}>History</span>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total points</div>
            <div style={{ ...styles.statValue, color: '#3B82F6' }}>
              {parseInt(stats.points).toLocaleString()}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Accuracy</div>
            <div style={styles.statValue}>{stats.accuracy}%</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Current streak</div>
            <div style={{ ...styles.statValue, color: '#00C46A' }}>
              {stats.current_streak}🔥
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Best streak</div>
            <div style={styles.statValue}>{stats.best_streak}</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={styles.filterRow}>
        {['all', 'correct', 'incorrect'].map((f) => (
          <button
            key={f}
            style={{
              ...styles.filterBtn,
              ...(filter === f ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Picks table */}
      {!filtered.length ? (
        <div style={styles.empty}>No picks yet</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Fighter', 'Fight', 'Type', 'Odds', 'Points', 'Result'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((pick) => (
                <tr key={pick.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.fighterName}>{pick.fighter_name}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: '12px', color: '#8A8F9E' }}>
                      {pick.fighter1_name} vs {pick.fighter2_name}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: '12px', color: '#8A8F9E' }}>
                      {pick.pick_type.toUpperCase()}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.odds}>{fmtOdds(pick.odds_at_pick)}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={{
                      fontWeight: 600,
                      color: pick.points_earned > 0 ? '#00C46A' : '#8A8F9E'
                    }}>
                      {pick.points_earned > 0 ? `+${pick.points_earned}` : '—'}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(pick.status === 'correct' ? styles.badgeWon : {}),
                      ...(pick.status === 'incorrect' ? styles.badgeLost : {}),
                    }}>
                      {pick.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '1.5rem 2rem', maxWidth: '860px', margin: '0 auto' },
  pageTitle: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '2rem', fontWeight: 800,
    letterSpacing: '0.04em', marginBottom: '1.5rem',
    color: '#F0F0F0',
  },
  red: { color: '#E8192C' },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px', marginBottom: '1.5rem',
  },
  statCard: {
    background: '#18191D', border: '1px solid #2A2C32',
    borderRadius: '8px', padding: '1rem',
  },
  statLabel: {
    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: '#8A8F9E', marginBottom: '6px',
  },
  statValue: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1.8rem', fontWeight: 800, color: '#F0F0F0',
  },
  filterRow: { display: 'flex', gap: '6px', marginBottom: '1rem' },
  filterBtn: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em',
    padding: '4px 14px', borderRadius: '4px',
    border: '1px solid #2A2C32', background: 'transparent',
    color: '#8A8F9E', cursor: 'pointer',
  },
  filterBtnActive: {
    background: '#1E2024', color: '#F0F0F0', borderColor: '#5A5F6E',
  },
  tableWrap: {
    background: '#18191D', border: '1px solid #2A2C32',
    borderRadius: '8px', overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', fontSize: '10px', fontWeight: 600,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: '#5A5F6E', padding: '10px 14px',
    borderBottom: '1px solid #2A2C32',
  },
  tr: { borderBottom: '1px solid #2A2C32' },
  td: { padding: '12px 14px' },
  fighterName: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem', fontWeight: 700, color: '#F0F0F0',
  },
  odds: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem', fontWeight: 800, color: '#F5A623',
  },
  badge: {
    fontSize: '10px', fontWeight: 700,
    fontFamily: "'Barlow Condensed', sans-serif",
    letterSpacing: '0.06em', padding: '2px 8px', borderRadius: '3px',
    background: '#2A2C32', color: '#8A8F9E',
  },
  badgeWon: { background: '#00C46A22', color: '#00C46A' },
  badgeLost: { background: '#E8192C22', color: '#E8192C' },
  empty: {
    textAlign: 'center', padding: '4rem',
    color: '#8A8F9E', fontSize: '14px',
  },
};