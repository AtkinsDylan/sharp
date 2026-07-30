import { useState } from 'react';

const SIZE = 56;

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function FighterAvatar({ name, imageUrl }) {
  const [errored, setErrored] = useState(false);
  const showFallback = !imageUrl || errored;

  return (
    <div style={styles.wrap}>
      {showFallback ? (
        <div style={styles.fallback}>{getInitials(name)}</div>
      ) : (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          onError={() => setErrored(true)}
          style={styles.img}
        />
      )}
    </div>
  );
}

const styles = {
  wrap: {
    width: SIZE,
    height: SIZE,
    flexShrink: 0,
    borderRadius: '50%',
    overflow: 'hidden',
  },
  img: {
    width: SIZE,
    height: SIZE,
    objectFit: 'cover',
    display: 'block',
  },
  fallback: {
    width: SIZE,
    height: SIZE,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#2A2C32',
    color: '#8A8F9E',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem',
    fontWeight: 700,
  },
};
