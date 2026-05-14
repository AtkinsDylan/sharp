import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/api';

export default function Navbar({ activePage, setActivePage }) {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    logoutUser();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        SHARP<span style={styles.dot}>·</span>
      </div>

      <div style={styles.links}>
        {['picks', 'pending', 'history', 'leaderboard'].map((page) => (
          <button
            key={page}
            style={{
              ...styles.navBtn,
              ...(activePage === page ? styles.navBtnActive : {}),
            }}
            onClick={() => setActivePage(page)}
          >
            {page.charAt(0).toUpperCase() + page.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.right}>
        <div style={styles.userInfo}>
          <span style={styles.username}>{user?.username}</span>
          <span style={styles.points}>{user?.points?.toLocaleString()} pts</span>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(10,10,10,0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #2A2C32',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    height: '56px',
  },
  logo: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1.6rem',
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: '#F0F0F0',
  },
  dot: { color: '#E8192C' },
  links: {
    display: 'flex',
    gap: '4px',
  },
  navBtn: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #2A2C32',
    background: 'transparent',
    color: '#8A8F9E',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  navBtnActive: {
    background: '#E8192C',
    borderColor: '#E8192C',
    color: '#fff',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  username: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#F0F0F0',
  },
  points: {
    fontSize: '11px',
    color: '#E8192C',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.05em',
  },
  logoutBtn: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '12px',
    padding: '5px 12px',
    borderRadius: '6px',
    border: '1px solid #2A2C32',
    background: 'transparent',
    color: '#8A8F9E',
    cursor: 'pointer',
  },
};