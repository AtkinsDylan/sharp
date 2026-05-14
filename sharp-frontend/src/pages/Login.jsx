import { useState } from 'react';
//import { useNavigate, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { login, signup } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(form);
        setIsSignup(false);
        setError('Account created! Please verify your email then log in.');
      } else {
        const res = await login({ email: form.email, password: form.password });
        loginUser(res.data.token, res.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>SHARP<span style={styles.dot}>·</span></div>
        <div style={styles.subtitle}>MMA Pick Em — Free to play</div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignup && (
            <input
              style={styles.input}
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'CREATE ACCOUNT' : 'LOG IN'}
          </button>
        </form>

        <div style={styles.toggle}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
          <span style={styles.toggleLink} onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? ' Log in' : ' Sign up'}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0A0A0A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Barlow', sans-serif",
  },
  card: {
    background: '#18191D',
    border: '1px solid #2A2C32',
    borderRadius: '12px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '380px',
  },
  logo: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '2rem',
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: '#F0F0F0',
    marginBottom: '4px',
  },
  dot: { color: '#E8192C' },
  subtitle: {
    fontSize: '13px',
    color: '#8A8F9E',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    background: '#111214',
    border: '1px solid #2A2C32',
    borderRadius: '6px',
    padding: '10px 14px',
    color: '#F0F0F0',
    fontSize: '14px',
    fontFamily: "'Barlow', sans-serif",
    outline: 'none',
  },
  error: {
    fontSize: '13px',
    color: '#E8192C',
    background: '#1a0a0c',
    border: '1px solid #3a1520',
    borderRadius: '6px',
    padding: '8px 12px',
  },
  btn: {
    background: '#E8192C',
    border: 'none',
    borderRadius: '6px',
    padding: '11px',
    color: '#fff',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    marginTop: '4px',
  },
  toggle: {
    fontSize: '13px',
    color: '#8A8F9E',
    textAlign: 'center',
    marginTop: '1.5rem',
  },
  toggleLink: {
    color: '#E8192C',
    cursor: 'pointer',
    fontWeight: 600,
  },
};