import { useEffect, useState } from 'react';
import { getEvents, getEvent, submitPick } from '../services/api';

const PICK_TYPES = [
  { id: 'ml', label: 'Moneyline' },
  { id: 'ko', label: 'KO/TKO/Sub' },
  { id: 'dec', label: 'Decision' },
  { id: 'r1', label: 'R1 Finish' },
  { id: 'r2', label: 'R2 Finish' },
  { id: 'r3', label: 'R3+ Finish' },
];

function getPointsPreview(pickType) {
  const points = { ml: 10, ko: 20, dec: 8, r1: 40, r2: 30, r3: 25 };
  return points[pickType] || 10;
}

export default function Picks() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [fights, setFights] = useState([]);
  const [pickType, setPickType] = useState('ml');
  const [submitting, setSubmitting] = useState(null);
  const [submitted, setSubmitted] = useState({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    getEvents().then((res) => {
      setEvents(res.data.events);
      if (res.data.events.length > 0) {
        setSelectedEvent(res.data.events[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      getEvent(selectedEvent.id).then((res) => setFights(res.data.fights));
    }
  }, [selectedEvent]);

  const handlePick = async (fight, fighterSelection) => {
    const key = `${fight.id}-${fighterSelection}`;
    setSubmitting(key);
    try {
      const res = await submitPick({
        fight_id: fight.id,
        fighter_selection: fighterSelection,
        pick_type: pickType,
      });
      setSubmitted((prev) => ({ ...prev, [fight.id]: fighterSelection }));
      showToast(`Pick submitted! Potential: +${res.data.potential_points} pts`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit pick');
    } finally {
      setSubmitting(null);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const cards = [...new Set(fights.map((f) => f.card_position))];

  return (
    <div style={styles.page}>
      {/* Event tabs */}
      <div style={styles.eventTabs}>
        {events.map((e) => (
          <button
            key={e.id}
            style={{
              ...styles.eventTab,
              ...(selectedEvent?.id === e.id ? styles.eventTabActive : {}),
            }}
            onClick={() => setSelectedEvent(e)}
          >
            {e.name}
          </button>
        ))}
      </div>

      {/* Pick type selector */}
      <div style={styles.pickTypeRow}>
        {PICK_TYPES.map((pt) => (
          <button
            key={pt.id}
            style={{
              ...styles.ptBtn,
              ...(pickType === pt.id ? styles.ptBtnActive : {}),
            }}
            onClick={() => setPickType(pt.id)}
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* Fight cards */}
      {cards.map((card) => (
        <div key={card} style={styles.card}>
          <div style={styles.cardHeader}>{card}</div>
          {fights
            .filter((f) => f.card_position === card)
            .map((fight) => {
              const picked = submitted[fight.id];
              return (
                <div key={fight.id} style={styles.fightRow}>
                  {/* Fighter 1 */}
                  <div style={styles.fighterBlock}>
                    <div style={styles.fighterName}>{fight.fighter1_name}</div>
                    <div style={styles.fighterRecord}>{fight.fighter1_record}</div>
                    <button
                      style={{
                        ...styles.pickBtn,
                        ...(picked === 'fighter1' ? styles.pickBtnSelected : {}),
                        ...(picked && picked !== 'fighter1' ? styles.pickBtnDisabled : {}),
                      }}
                      onClick={() => !picked && handlePick(fight, 'fighter1')}
                      disabled={!!picked || submitting === `${fight.id}-fighter1`}
                    >
                      <span style={styles.ptsBadge}>
                        +{getPointsPreview(pickType)} pts
                      </span>
                    </button>
                  </div>

                  {/* VS */}
                  <div style={styles.vsCol}>
                    <div style={styles.vsText}>VS</div>
                    <div style={styles.weightClass}>{fight.weight_class}</div>
                  </div>

                  {/* Fighter 2 */}
                  <div style={{ ...styles.fighterBlock, alignItems: 'flex-end' }}>
                    <div style={styles.fighterName}>{fight.fighter2_name}</div>
                    <div style={styles.fighterRecord}>{fight.fighter2_record}</div>
                    <button
                      style={{
                        ...styles.pickBtn,
                        ...(picked === 'fighter2' ? styles.pickBtnSelected : {}),
                        ...(picked && picked !== 'fighter2' ? styles.pickBtnDisabled : {}),
                      }}
                      onClick={() => !picked && handlePick(fight, 'fighter2')}
                      disabled={!!picked || submitting === `${fight.id}-fighter2`}
                    >
                      <span style={styles.ptsBadge}>
                        +{getPointsPreview(pickType)} pts
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      ))}

      {/* Toast */}
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  page: { padding: '1.5rem 2rem', maxWidth: '860px', margin: '0 auto' },
  eventTabs: { display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' },
  eventTab: {
    fontFamily: "'Barlow', sans-serif",
    fontSize: '12px', fontWeight: 500,
    padding: '5px 14px', borderRadius: '99px',
    border: '1px solid #2A2C32', background: 'transparent',
    color: '#8A8F9E', cursor: 'pointer',
  },
  eventTabActive: { background: '#E8192C', borderColor: '#E8192C', color: '#fff' },
  pickTypeRow: { display: 'flex', gap: '6px', marginBottom: '1.5rem', flexWrap: 'wrap' },
  ptBtn: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em',
    padding: '4px 12px', borderRadius: '4px',
    border: '1px solid #2A2C32', background: 'transparent',
    color: '#8A8F9E', cursor: 'pointer',
  },
  ptBtnActive: { background: '#1a2a3a', borderColor: '#3B82F6', color: '#3B82F6' },
  card: {
    background: '#18191D', border: '1px solid #2A2C32',
    borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem',
  },
  cardHeader: {
    background: '#1E2024', padding: '8px 1rem',
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#8A8F9E',
    borderBottom: '1px solid #2A2C32',
  },
  fightRow: {
    display: 'grid', gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center', padding: '1rem',
    borderBottom: '1px solid #2A2C32',
  },
  fighterBlock: { display: 'flex', flexDirection: 'column', gap: '4px' },
  fighterName: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem', fontWeight: 700, color: '#F0F0F0',
  },
  fighterRecord: { fontSize: '11px', color: '#8A8F9E' },
  pickBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em',
    padding: '6px 12px', borderRadius: '5px',
    border: '1px solid #2A2C32', background: 'transparent',
    color: '#8A8F9E', cursor: 'pointer', marginTop: '4px',
    width: 'fit-content',
  },
  pickBtnSelected: { background: '#E8192C', borderColor: '#E8192C', color: '#fff' },
  pickBtnDisabled: { opacity: 0.3, cursor: 'not-allowed' },
  ptsBadge: {
    fontSize: '10px', fontWeight: 600,
    color: '#00C46A', fontFamily: "'Barlow', sans-serif",
  },
  vsCol: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '4px', padding: '0 1rem',
  },
  vsText: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: '0.75rem', fontWeight: 700,
    color: '#5A5F6E', letterSpacing: '0.1em',
  },
  weightClass: {
    fontSize: '10px', color: '#5A5F6E',
    textAlign: 'center', maxWidth: '80px',
  },
  toast: {
    position: 'fixed', bottom: '24px', left: '50%',
    transform: 'translateX(-50%)',
    background: '#18191D', border: '1px solid #2A2C32',
    color: '#F0F0F0', padding: '10px 20px',
    borderRadius: '6px', fontSize: '13px', fontWeight: 500,
    whiteSpace: 'nowrap', zIndex: 999,
  },
};