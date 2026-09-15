import React, { useState, useEffect } from 'react';
import { dbListen, dbSet, dbUpdate, dbGet, matchPath, availabilityPath } from './firebase';
import { colors, fonts, btn, radii, shadows } from './theme';

// ─── Styles ────────────────────────────────────────────────────────────────
const S = {
  card: {
    background: '#fff',
    borderRadius: radii.lg,
    boxShadow: shadows.card,
    padding: '20px 24px',
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: `1.5px solid ${colors.courtDeep}`,
    borderRadius: radii.md,
    fontFamily: fonts.body,
    fontSize: 14,
    background: '#fff',
    color: colors.textPrimary,
    boxSizing: 'border-box',
    outline: 'none',
  },
  slot: (common) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: common ? '#D1FAE5' : colors.court,
    color: common ? '#065F46' : colors.textSecondary,
    border: `1px solid ${common ? '#6EE7B7' : colors.courtDeep}`,
    margin: '3px',
  }),
  matchCard: {
    background: '#fff',
    borderRadius: radii.md,
    border: `1px solid ${colors.courtDeep}`,
    padding: '14px 16px',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};

// ─── Generate upcoming dates (next 8 weeks, weekends + weekdays) ───────────
function getUpcomingDates(weeksAhead = 8) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= weeksAhead * 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    const weekday = d.toLocaleString('default', { weekday: 'short' });
    dates.push({ key: `${month} ${day}`, label: `${weekday}, ${month} ${day}` });
  }
  return dates;
}

const TIMES = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM',
];

// ─── Main Schedule Tab ─────────────────────────────────────────────────────
export function ScheduleTab({ leagueId, lg, players, isManager, user, matches }) {
  const [availability, setAvailability] = useState({});
  const [pendingMatches, setPendingMatches] = useState([]);
  const [view, setView] = useState('my'); // my | schedule | suggest

  const myName = (() => {
    if (!user) return null;
    // Find player name by matching display name or email prefix
    const emailPrefix = user.email?.split('@')[0]?.toLowerCase();
    const displayName = user.displayName?.toLowerCase();
    return players.find(p =>
      p.toLowerCase() === displayName ||
      p.toLowerCase().includes(emailPrefix) ||
      emailPrefix?.includes(p.toLowerCase())
    ) || null;
  })();

  // Load availability
  useEffect(() => {
    const unsub = dbListen(availabilityPath(leagueId), data => {
      setAvailability(data || {});
    });
    return unsub;
  }, [leagueId]);

  // Get pending matches
  useEffect(() => {
    setPendingMatches(matches.filter(m => !m.done));
  }, [matches]);

  const tabs = [
    ['my', '📅 My Availability'],
    ['schedule', '🗓 Match Schedule'],
    ...(isManager ? [['suggest', '🤝 Schedule Match']] : []),
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setView(id)} style={{
            padding: '7px 16px',
            border: 'none',
            borderRadius: 20,
            cursor: 'pointer',
            fontFamily: fonts.body,
            fontWeight: view === id ? 700 : 500,
            fontSize: 13,
            background: view === id ? colors.baseline : colors.courtDeep,
            color: view === id ? '#fff' : colors.textSecondary,
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {view === 'my' && (
        <MyAvailability
          leagueId={leagueId}
          myName={myName}
          availability={availability}
          players={players}
          user={user}
        />
      )}
      {view === 'schedule' && (
        <MatchSchedule pendingMatches={pendingMatches} lg={lg}/>
      )}
      {view === 'suggest' && isManager && (
        <SuggestMatch
          leagueId={leagueId}
          lg={lg}
          players={players}
          availability={availability}
          matches={matches}
          isManager={isManager}
        />
      )}
    </div>
  );
}

// ─── My Availability ───────────────────────────────────────────────────────
function MyAvailability({ leagueId, myName, availability, players, user }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [playerOverride, setPlayerOverride] = useState(''); // for managers to set on behalf

  const dates = getUpcomingDates();
  const effectiveName = playerOverride || myName;

  const mySlots = effectiveName
    ? Object.entries(availability[effectiveName] || {}).map(([date, time]) => ({ date, time }))
    : [];

  const addSlot = async () => {
    if (!selectedDate || !selectedTime || !effectiveName) return;
    setSaving(true);
    const slotValue = note ? `${selectedTime} — ${note}` : selectedTime;
    await dbSet(
      `${availabilityPath(leagueId)}/${effectiveName}/${selectedDate}`,
      slotValue
    );
    setSelectedDate('');
    setSelectedTime('');
    setNote('');
    setSaving(false);
  };

  const removeSlot = async (date) => {
    if (!effectiveName) return;
    await dbSet(`${availabilityPath(leagueId)}/${effectiveName}/${date}`, null);
  };

  if (!myName && !playerOverride) {
    return (
      <div style={{ ...S.card, textAlign: 'center', padding: '32px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
        <div style={{ fontWeight: 700, color: colors.baseline, marginBottom: 8 }}>
          Name not matched
        </div>
        <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
          Your account couldn't be matched to a player name. Select your name below:
        </div>
        <select value={playerOverride} onChange={e => setPlayerOverride(e.target.value)}
          style={{ ...S.input, maxWidth: 280, margin: '0 auto' }}>
          <option value="">Select your name…</option>
          {players.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div>
      {/* Add availability */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, color: colors.baseline, fontSize: 15, marginBottom: 16 }}>
          📅 Add Availability
          {effectiveName && (
            <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 400, marginLeft: 8 }}>
              as {effectiveName}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Date</label>
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={S.input}>
              <option value="">Select date…</option>
              {dates.map(d => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={S.label}>Time</label>
            <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} style={S.input}>
              <option value="">Select time…</option>
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Note (optional)</label>
          <input
            placeholder="e.g. only if indoors, flexible on time"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={S.input}
          />
        </div>

        <button onClick={addSlot} disabled={!selectedDate || !selectedTime || saving}
          style={{ ...btn.primary, padding: '10px 20px' }}>
          {saving ? 'Saving…' : '+ Add Slot'}
        </button>
      </div>

      {/* My slots */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, color: colors.baseline, fontSize: 15, marginBottom: 14 }}>
          My Available Slots ({mySlots.length})
        </div>
        {mySlots.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            No availability added yet
          </div>
        ) : (
          <div>
            {mySlots.sort((a, b) => a.date.localeCompare(b.date)).map(({ date, time }) => (
              <div key={date} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: radii.md, marginBottom: 6,
                background: colors.court,
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: colors.baseline, fontSize: 13 }}>{date}</span>
                  <span style={{ color: colors.textSecondary, fontSize: 13, marginLeft: 10 }}>{time}</span>
                </div>
                <button onClick={() => removeSlot(date)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.textMuted, fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All players availability overview */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, color: colors.baseline, fontSize: 15, marginBottom: 14 }}>
          League Availability Overview
        </div>
        {players.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: 13 }}>No players yet</div>
        ) : (
          <div>
            {players.map(player => {
              const slots = Object.entries(availability[player] || {});
              return (
                <div key={player} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: colors.baseline, marginBottom: 4 }}>
                    {player}
                    {slots.length === 0 && (
                      <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 400, marginLeft: 6 }}>
                        — no availability added
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {slots.map(([date, time]) => (
                      <span key={date} style={S.slot(false)}>
                        {date} · {time}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Match Schedule ────────────────────────────────────────────────────────
function MatchSchedule({ pendingMatches, lg }) {
  const sorted = [...pendingMatches].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return (
    <div style={S.card}>
      <div style={{ fontWeight: 700, color: colors.baseline, fontSize: 15, marginBottom: 16 }}>
        Upcoming Matches ({sorted.length})
      </div>
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, padding: '24px 0' }}>
          No upcoming matches scheduled
        </div>
      ) : sorted.map(m => (
        <div key={m.id} style={S.matchCard}>
          <div>
            <div style={{ fontWeight: 700, color: colors.baseline, fontSize: 14 }}>
              {m.a} <span style={{ color: colors.textMuted, fontWeight: 400 }}>vs</span> {m.b}
            </div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 3 }}>
              {m.date && <span>{m.date}</span>}
              {m.time && <span> · {m.time}</span>}
              {m.venue && <span> · 📍 {m.venue}</span>}
            </div>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
            background: colors.court, color: colors.net, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {lg === 'doubles' ? '👥' : '👤'} Pending
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Suggest Match (Manager only) ─────────────────────────────────────────
function SuggestMatch({ leagueId, lg, players, availability, matches, isManager }) {
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [venue, setVenue] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [msg, setMsg] = useState('');

  // Find common available dates between two players
  const commonSlots = (() => {
    if (!playerA || !playerB) return [];
    const aSlots = availability[playerA] || {};
    const bSlots = availability[playerB] || {};
    return Object.keys(aSlots)
      .filter(date => bSlots[date])
      .map(date => ({
        date,
        timeA: aSlots[date],
        timeB: bSlots[date],
      }));
  })();

  // Check if this matchup already exists as pending
  const alreadyScheduled = matches.some(m =>
    !m.done &&
    ((m.a === playerA && m.b === playerB) || (m.a === playerB && m.b === playerA))
  );

  const scheduleMatch = async () => {
    if (!playerA || !playerB) return;
    setScheduling(true);
    const matchId = `${lg[0]}${Date.now()}`;
    let date = '', time = '';
    if (selectedSlot) {
      const slot = commonSlots.find(s => s.date === selectedSlot);
      if (slot) { date = slot.date; time = slot.timeA; }
    }
    await dbSet(matchPath(leagueId, lg, matchId), {
      id: matchId,
      a: playerA, b: playerB,
      date, time,
      venue,
      sa: '', sb: '',
      done: false,
      createdAt: Date.now(),
    });
    // Remove used availability slots
    if (date) {
      await dbSet(`${availabilityPath(leagueId)}/${playerA}/${date}`, null);
      await dbSet(`${availabilityPath(leagueId)}/${playerB}/${date}`, null);
    }
    setMsg(`✓ Match scheduled: ${playerA} vs ${playerB}${date ? ` on ${date}` : ''}`);
    setPlayerA(''); setPlayerB(''); setSelectedSlot(''); setVenue('');
    setScheduling(false);
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div>
      {msg && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: radii.md,
          padding: '12px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <div style={S.card}>
        <div style={{ fontWeight: 700, color: colors.baseline, fontSize: 15, marginBottom: 16 }}>
          Schedule a Match
        </div>

        {/* Player selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[['playerA', playerA, setPlayerA], ['playerB', playerB, setPlayerB]].map(([key, val, setter], i) => (
            <div key={key}>
              <label style={S.label}>{lg === 'doubles' ? `Team ${i + 1}` : `Player ${i + 1}`}</label>
              <select value={val} onChange={e => setter(e.target.value)} style={S.input}>
                <option value="">Select…</option>
                {players.filter(p => p !== (i === 0 ? playerB : playerA)).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {alreadyScheduled && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B',
            borderRadius: radii.md, padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
            ⚠️ This matchup is already scheduled as pending
          </div>
        )}

        {/* Common slots */}
        {playerA && playerB && (
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Common Available Slots</label>
            {commonSlots.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.textMuted, padding: '8px 0' }}>
                No common availability found — you can still schedule without a slot
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {commonSlots.map(slot => (
                  <button key={slot.date}
                    onClick={() => setSelectedSlot(selectedSlot === slot.date ? '' : slot.date)}
                    style={{
                      ...S.slot(selectedSlot === slot.date),
                      cursor: 'pointer',
                      border: `2px solid ${selectedSlot === slot.date ? '#059669' : '#6EE7B7'}`,
                      background: selectedSlot === slot.date ? '#059669' : '#D1FAE5',
                      color: selectedSlot === slot.date ? '#fff' : '#065F46',
                    }}>
                    ✓ {slot.date} · {slot.timeA}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Venue */}
        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Venue (optional)</label>
          <input placeholder="e.g. JFK Tennis Courts"
            value={venue} onChange={e => setVenue(e.target.value)} style={S.input}/>
        </div>

        <button onClick={scheduleMatch}
          disabled={!playerA || !playerB || scheduling || alreadyScheduled}
          style={{ ...btn.primary, padding: '11px 24px' }}>
          {scheduling ? 'Scheduling…' : 'Schedule Match'}
        </button>
      </div>

      {/* Availability summary for selection */}
      {(playerA || playerB) && (
        <div style={S.card}>
          <div style={{ fontWeight: 700, color: colors.baseline, fontSize: 14, marginBottom: 12 }}>
            Availability Summary
          </div>
          {[playerA, playerB].filter(Boolean).map(player => {
            const slots = Object.entries(availability[player] || {});
            return (
              <div key={player} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.baseline, marginBottom: 4 }}>
                  {player}
                </div>
                {slots.length === 0 ? (
                  <div style={{ fontSize: 12, color: colors.textMuted }}>No availability added</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {slots.map(([date, time]) => {
                      const isCommon = commonSlots.some(s => s.date === date);
                      return (
                        <span key={date} style={S.slot(isCommon)}>
                          {isCommon && '✓ '}{date} · {time}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
