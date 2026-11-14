import React, { useState, useEffect } from 'react';
import { ref, runTransaction } from 'firebase/database';
import { db, dbListen, dbGet, dbPush, dbSet, individualPlayersPath, playersPath } from './firebase';
import { colors, fonts, btn, radii, shadows } from './theme';

const toList = v => !v ? [] : Array.isArray(v) ? v.filter(Boolean) : Object.values(v).filter(Boolean);

const LABELS = { both: 'Singles & Doubles', singles: 'Singles only', doubles: 'Doubles only' };
const OPTIONS = [
  ['both', '🎾 Singles & Doubles'],
  ['singles', '👤 Singles only'],
  ['doubles', '👥 Doubles only'],
];

const S = {
  card: {
    background: '#fff',
    borderRadius: radii.lg,
    boxShadow: shadows.card,
    padding: '20px 24px',
    marginBottom: 24,
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
};

// Lets a manager add a player who has no login. They go into the same pool the
// registration flow uses, so Build Teams and the Singles roster work unchanged.
export function AddPlayerForm({ leagueId }) {
  const [name, setName] = useState('');
  const [enrollment, setEnrollment] = useState('both');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [pool, setPool] = useState({});

  useEffect(() => dbListen(individualPlayersPath(leagueId), d => setPool(d || {})), [leagueId]);

  const flash = (ok, text) => {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const addPlayer = async () => {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (!clean || busy) return;
    if (clean.length > 40) { flash(false, 'Name is too long (40 characters max)'); return; }
    if (clean.includes('/')) { flash(false, 'Names can\'t contain "/" because it is used to join doubles team names'); return; }

    setBusy(true);
    try {
      const lower = clean.toLowerCase();
      const [poolNow, singlesNow] = await Promise.all([
        dbGet(individualPlayersPath(leagueId)),
        dbGet(playersPath(leagueId, 'singles')),
      ]);
      const taken =
        toList(poolNow).some(p => String(p.name || '').toLowerCase() === lower) ||
        toList(singlesNow).some(n => String(n).toLowerCase() === lower);
      if (taken) { flash(false, `${clean} is already in this league`); return; }

      // Pool entry: push() creates a new child, so it can't overwrite anyone else's entry
      await dbPush(individualPlayersPath(leagueId), {
        uid: `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: clean,
        enrollment,
        manual: true,
        addedAt: Date.now(),
      });

      // Singles roster is one shared array, so use a transaction instead of read-then-overwrite
      if (enrollment === 'singles' || enrollment === 'both') {
        await runTransaction(ref(db, playersPath(leagueId, 'singles')), current => {
          const list = toList(current);
          if (list.some(n => String(n).toLowerCase() === lower)) return; // already there, leave it
          return [...list, clean];
        });
      }

      setName('');
      flash(true, `${clean} added (${LABELS[enrollment]})`);
    } catch (e) {
      console.error('Add player failed:', e);
      flash(false, 'Could not add player. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const removePlayer = async (key, p) => {
    const ok = window.confirm(
      `Remove ${p.name}? They will be taken out of the player pool` +
      `${p.enrollment !== 'doubles' ? ' and the singles roster' : ''}. ` +
      'A doubles team they are already part of is not changed.'
    );
    if (!ok) return;
    try {
      await dbSet(`${individualPlayersPath(leagueId)}/${key}`, null);
      if (p.enrollment === 'singles' || p.enrollment === 'both') {
        await runTransaction(ref(db, playersPath(leagueId, 'singles')), current => {
          const list = toList(current);
          if (!list.includes(p.name)) return; // nothing to remove
          return list.filter(n => n !== p.name);
        });
      }
    } catch (e) {
      console.error('Remove player failed:', e);
      flash(false, 'Could not remove player. Please try again.');
    }
  };

  const manual = Object.entries(pool).filter(([, p]) => p && p.manual);

  return (
    <div style={S.card}>
      <div style={{ fontWeight: 700, color: colors.baseline, fontSize: 15, marginBottom: 4 }}>
        Add a Player
      </div>
      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
        For players who haven't signed up themselves. They are added straight to the league, no approval needed.
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>Player name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPlayer()}
          placeholder="e.g. Rahul Sharma"
          style={S.input}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>Plays</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {OPTIONS.map(([val, label]) => (
            <button key={val} onClick={() => setEnrollment(val)} style={{
              flex: 1,
              minWidth: 110,
              padding: '10px 8px',
              border: `2px solid ${enrollment === val ? colors.baseline : colors.courtDeep}`,
              borderRadius: radii.md,
              background: enrollment === val ? colors.baseline : '#fff',
              color: enrollment === val ? '#fff' : colors.textSecondary,
              fontFamily: fonts.body,
              fontWeight: enrollment === val ? 700 : 500,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'center',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <button onClick={addPlayer} disabled={!name.trim() || busy}
        style={{ ...btn.primary, padding: '10px 20px' }}>
        {busy ? 'Adding…' : '+ Add Player'}
      </button>

      {msg && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: radii.md, fontSize: 13, fontWeight: 600,
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
          color: msg.ok ? '#065F46' : '#991B1B',
        }}>{msg.text}</div>
      )}

      {manual.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${colors.courtDeep}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.baseline, marginBottom: 8 }}>
            Added by a manager ({manual.length})
          </div>
          {manual.map(([key, p]) => (
            <div key={key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', borderRadius: radii.md, background: colors.court, marginBottom: 6,
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.baseline }}>{p.name}</span>
                <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 8 }}>
                  {LABELS[p.enrollment] || LABELS.both}
                </span>
              </div>
              <button onClick={() => removePlayer(key, p)}
                style={{ ...btn.danger, padding: '3px 8px', fontSize: 11 }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
