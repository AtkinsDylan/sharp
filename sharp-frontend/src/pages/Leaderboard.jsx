import { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/api';


export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [period, setPeriod] = useState('alltime');
  const [loading, setLoading] = useState(true);
  


// eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await getLeaderboard(period);
        setLeaderboard(res.data.leaderboard);
        setMyRank(res.data.my_rank);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [period]);

  return (
    <div style={styles.page}>
      <div style={styles.pageTitle}>
        Leader<span style={styles.red}>board</span>
      </div>

      {/* Period toggle */}
      <div style={styles.filterRow}>
        {[
          { id: 'alltime', label: 'All Time' },
          { id: 'weekly', label: 'This Week' },
        ].map((p) => (
          <button
            key={p.id}
            style={{
              ...styles.filterBtn,
              ...(period === p.id ? styles.filterBtnActive : {}),
            }}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* My rank if outside top 50 */}
      {myRank && (
        <div style={styles.myRankBanner}>
          Your rank: <strong style={{ color: '#E8192C' }}>#{myRank}</strong>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={styles.empty}>Loading...</div>
      ) : !leaderboard.length ? (
        <div style={styles.empty}>No data yet — make some picks!</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Rank', 'Player', 'Points', 'Picks', 'Accuracy', 'Streak'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    ...styles.tr,
                    ...(row.is_me ? styles.trMe : {}),
                  }}
                >
                  <td style={styles.td}>
                    <div style={styles.rank}>
                      {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.username}>
                      {row.username}
                      {row.is_me && <span style={styles.youBadge}>YOU</span>}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.points}>
                      {parseInt(row.points).toLocaleString()}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: '13px', color: '#8A8F9E' }}>
                      {row.total_picks}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: '13px', color: '#F0F0F0' }}>
                      {row.total_picks > 0
                        ? `${Math.round((row.correct_picks / row.total_picks) * 100)}%`
                        : '—'}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ fontSize: '13px', color: '#00C46A' }}>
                      {row.current_streak > 0 ? `${row.current_streak}🔥` : '—'}
                    </div>
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
  filterRow: { display: 'flex', gap: '6px', marginBottom: '1.5rem' },
  filterBtn: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em',
    padding: '4px 14px', borderRadius: '4px',
    border: '1px solid #2A2C32', background: 'transparent',
    color: '#8A8F9E', cursor: 'pointer',
  },
  filterBtnActive: {
    background: '#E8192C', borderColor: '#E8192C', color: '#fff',
  },
  myRankBanner: {
    background: '#18191D', border: '1px solid #2A2C32',
    borderRadius: '6px', padding: '10px 14px',
    fontSize: '13px', color: '#8A8F9E', marginBottom: '1rem',
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
  trMe: { background: '#1a0a0c' },
  td: { padding: '12px 14px' },
  rank: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem', fontWeight: 800, color: '#F0F0F0',
  },
  username: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem', fontWeight: 700, color: '#F0F0F0',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  youBadge: {
    fontSize: '9px', fontWeight: 700, padding: '1px 5px',
    borderRadius: '3px', background: '#E8192C22', color: '#E8192C',
    letterSpacing: '0.06em',
  },
  points: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem', fontWeight: 800, color: '#3B82F6',
  },
  empty: {
    textAlign: 'center', padding: '4rem',
    color: '#8A8F9E', fontSize: '14px',
  },
};