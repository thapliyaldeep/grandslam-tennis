import React, { useState, useEffect } from 'react';
import { dbListen, dbSet, dbGet, submitRegistration, approveRegistration,
         rejectRegistration, registrationsPath, individualPlayersPath,
         playersPath } from './firebase';
import { colors, fonts, btn, radii, shadows } from './theme';

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
  badge: (color, bg) => ({
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    padding: '2px 8px',
    borderRadius: 20,
    color,
    background: bg,
  }),
};

// ─── Registration Gate ─────────────────────────────────────────────────────
// Shown to logged-in users who haven't registered for this league yet
export function RegistrationGate({ leagueId, user, leagueName, onRegistered }) {
  const [name, setName] = useState(user.displayName || '');
  const [enrollment, setEnrollment] = useState('both'); // singles | doubles | both
  const [status, setStatus] = useState('idle'); // idle | submitting | pending | approved | rejected
  const [error, setError] = useState('');

  // Check if already registered
  useEffect(() => {
    const unsub = dbListen(`leagues/${leagueId}/registrations/${user.uid}`, reg => {
      if (!reg) { setStatus('idle'); return; }
      setStatus(reg.status);
      if (reg.status === 'approved') onRegistered(reg.name);
    });
    return unsub;
  }, [leagueId, user.uid, onRegistered]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    setError('');
    setStatus('submitting');
    try {
      await submitRegistration(leagueId, user, name, enrollment);
      setStatus('pending');
    } catch(e) {
      setError('Failed to submit. Please try again.');
      setStatus('idle');
    }
  };

  if (status === 'approved') return null; // parent handles this

  return (
    <div style={{ minHeight: '100vh', background: colors.court, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ ...S.card, maxWidth: 420, width: '100%', padding: '36px 32px' }}>

        <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 24,
          color: colors.baseline, marginBottom: 6 }}>
          Join {leagueName}
        </div>
        <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 28 }}>
          Register to participate in this league
        </div>

        {status === 'pending' && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B',
            borderRadius: radii.md, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
              ⏳ Registration Pending
            </div>
            <div style={{ fontSize: 13, color: '#78350F' }}>
              Your request has been sent to the league manager for approval.
              You'll be able to access the league once approved.
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div style={{ background: '#FEE2E2', border: '1px solid #EF4444',
            borderRadius: radii.md, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>
              ❌ Registration Not Approved
            </div>
            <div style={{ fontSize: 13, color: '#7F1D1D' }}>
              Contact the league manager for more information.
            </div>
          </div>
        )}

        {(status === 'idle' || status === 'submitting') && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Your Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. Rahul Sharma"
                style={S.input}
                autoFocus
              />
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 5 }}>
                This is how your name will appear in the league
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>I want to play</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  ['both', '🎾 Singles & Doubles'],
                  ['singles', '👤 Singles only'],
                  ['doubles', '👥 Doubles only'],
                ].map(([val, label]) => (
                  <button key={val} onClick={() => setEnrollment(val)} style={{
                    flex: 1,
                    padding: '10px 8px',
                    border: `2px solid ${enrollment === val ? colors.baseline : colors.courtDeep}`,
                    borderRadius: radii.md,
                    background: enrollment === val ? colors.baseline : '#fff',
                    color: enrollment === val ? '#fff' : colors.textSecondary,
                    fontFamily: fonts.body,
                    fontWeight: enrollment === val ? 700 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {error && <div style={{ color: colors.live, fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <button onClick={handleSubmit} disabled={status === 'submitting'}
              style={{ ...btn.primary, width: '100%', padding: '13px 20px', fontSize: 15 }}>
              {status === 'submitting' ? 'Submitting…' : 'Request to Join'}
            </button>
          </>
        )}

        <div style={{ marginTop: 20, paddingTop: 16,
          borderTop: `1px solid ${colors.courtDeep}`,
          fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
          Signed in as {user.email}
        </div>
      </div>
    </div>
  );
}

// ─── Registration Manager (for admins) ────────────────────────────────────
export function RegistrationManager({ leagueId }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = dbListen(registrationsPath(leagueId), data => {
      if (!data) { setRegistrations([]); setLoading(false); return; }
      const regs = Object.values(data).sort((a, b) => b.requestedAt - a.requestedAt);
      setRegistrations(regs);
      setLoading(false);
    });
    return unsub;
  }, [leagueId]);

  const pending = registrations.filter(r => r.status === 'pending');
  const approved = registrations.filter(r => r.status === 'approved');
  const rejected = registrations.filter(r => r.status === 'rejected');

  const handleApprove = async (reg) => {
    await approveRegistration(leagueId, reg.uid, reg.name, reg.enrollment || 'both');
  };

  const handleReject = async (reg) => {
    await rejectRegistration(leagueId, reg.uid);
  };

  const handleRemove = async (reg) => {
    if (!window.confirm(`Remove ${reg.name}'s registration entirely?`)) return;
    await dbSet(`leagues/${leagueId}/registrations/${reg.uid}`, null);
    // Also remove from individual player pool if approved
    if (reg.status === 'approved') {
      const pool = await dbGet(individualPlayersPath(leagueId));
      if (pool) {
        const entries = Object.entries(pool);
        const entry = entries.find(([, p]) => p.uid === reg.uid);
        if (entry) await dbSet(`${individualPlayersPath(leagueId)}/${entry[0]}`, null);
      }
    }
  };

  if (loading) return <div style={{ color: colors.textMuted, fontSize: 13 }}>Loading registrations…</div>;

  return (
    <div>
      {/* Pending */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.baseline,
          marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          Pending Approval
          {pending.length > 0 && (
            <span style={{ background: colors.clay, color: '#fff',
              borderRadius: 20, fontSize: 11, fontWeight: 700,
              padding: '1px 8px' }}>{pending.length}</span>
          )}
        </div>

        {pending.length === 0 ? (
          <div style={{ fontSize: 13, color: colors.textMuted }}>No pending registrations</div>
        ) : pending.map(reg => (
          <RegistrationRow key={reg.uid} reg={reg}
            onApprove={() => handleApprove(reg)}
            onReject={() => handleReject(reg)}
          />
        ))}
      </div>

      {/* Approved */}
      {approved.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.baseline, marginBottom: 12 }}>
            Approved ({approved.length})
          </div>
          {approved.map(reg => <RegistrationRow key={reg.uid} reg={reg} approved
            onRemove={() => handleRemove(reg)}/>)}
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.baseline, marginBottom: 12 }}>
            Rejected ({rejected.length})
          </div>
          {rejected.map(reg => (
            <RegistrationRow key={reg.uid} reg={reg} rejected
              onApprove={() => handleApprove(reg)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RegistrationRow({ reg, onApprove, onReject, onRemove, approved, rejected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', background: '#fff', borderRadius: radii.md,
      border: `1px solid ${colors.courtDeep}`, marginBottom: 8 }}>
      <div>
        <div style={{ fontWeight: 600, color: colors.baseline, fontSize: 14 }}>{reg.name}</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{reg.email}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
            background: reg.enrollment === 'singles' ? '#DBEAFE'
              : reg.enrollment === 'doubles' ? '#D1FAE5' : '#F3E8FF',
            color: reg.enrollment === 'singles' ? '#1E40AF'
              : reg.enrollment === 'doubles' ? '#065F46' : '#6B21A8',
          }}>
            {reg.enrollment === 'singles' ? '👤 Singles only'
              : reg.enrollment === 'doubles' ? '👥 Doubles only'
              : '🎾 Singles & Doubles'}
          </span>
          <span style={{ fontSize: 10, color: colors.textMuted }}>
            {new Date(reg.requestedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {approved && <span style={S.badge('#065F46', '#D1FAE5')}>✓ Approved</span>}
        {rejected && (
          <>
            <span style={S.badge('#991B1B', '#FEE2E2')}>✗ Rejected</span>
            <button onClick={onApprove} style={{ ...btn.ghost, padding: '4px 10px', fontSize: 11 }}>
              Approve
            </button>
          </>
        )}
        {!approved && !rejected && (
          <>
            <button onClick={onApprove}
              style={{ ...btn.primary, padding: '5px 12px', fontSize: 12 }}>
              ✓ Approve
            </button>
            <button onClick={onReject}
              style={{ ...btn.danger, padding: '5px 12px', fontSize: 12 }}>
              ✗ Reject
            </button>
          </>
        )}
        {onRemove && (
          <button onClick={onRemove}
            style={{ ...btn.ghost, padding: '4px 8px', fontSize: 11,
              color: colors.textMuted, borderColor: colors.courtDeep }}>
            🗑
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Doubles Team Builder ──────────────────────────────────────────────────
export function DoublesTeamBuilder({ leagueId }) {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Listen to individual player pool
    const unsub1 = dbListen(individualPlayersPath(leagueId), data => {
      setPlayers(data ? Object.values(data) : []);
      setLoading(false);
    });
    // Listen to doubles teams - stored as array, Firebase may return object
    const unsub2 = dbListen(playersPath(leagueId, 'doubles'), data => {
      if (!data) { setTeams([]); return; }
      const arr = Array.isArray(data) ? data : Object.values(data);
      setTeams(arr.filter(Boolean)); // filter out nulls
    });
    return () => { unsub1(); unsub2(); };
  }, [leagueId]);

  const toggleSelect = (player) => {
    setSelected(prev => {
      const already = prev.find(p => p.uid === player.uid);
      if (already) return prev.filter(p => p.uid !== player.uid);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, player];
    });
  };

  const createTeam = async () => {
    if (selected.length !== 2) return;
    const teamName = `${selected[0].name}/${selected[1].name}`;
    if (teams.includes(teamName)) {
      setStatus('Team already exists'); return;
    }
    await dbSet(playersPath(leagueId, 'doubles'), [...teams, teamName]);
    setSelected([]);
    setStatus(`Team "${teamName}" created!`);
    setTimeout(() => setStatus(''), 3000);
  };

  const removeTeam = async (teamName) => {
    if (!window.confirm(`Remove team "${teamName}"?`)) return;
    await dbSet(playersPath(leagueId, 'doubles'), teams.filter(t => t !== teamName));
  };

  const addToSingles = async (player) => {
    const current = await dbGet(playersPath(leagueId, 'singles'));
    const arr = current ? Object.values(current) : [];
    if (arr.includes(player.name)) { setStatus(`${player.name} already in singles`); return; }
    await dbSet(playersPath(leagueId, 'singles'), [...arr, player.name]);
    setStatus(`${player.name} added to singles`);
    setTimeout(() => setStatus(''), 3000);
  };

  // Only show players who want to play doubles
  const doublesEligible = players.filter(p => !p.enrollment || p.enrollment === 'doubles' || p.enrollment === 'both');

  if (loading) return <div style={{ color: colors.textMuted, fontSize: 13 }}>Loading players…</div>;

  if (players.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: colors.textMuted, fontSize: 13 }}>
        No approved players yet. Approve registrations first.
      </div>
    );
  }

  if (doublesEligible.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: colors.textMuted, fontSize: 13 }}>
        No players enrolled for doubles. Players who chose "Singles only" won't appear here.
      </div>
    );
  }

  return (
    <div>
      {status && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: radii.md,
          padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {status}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Left: Player pool */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.baseline, marginBottom: 8 }}>
            Player Pool ({players.length})
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
            Select 2 players to create a doubles team
          </div>

          {doublesEligible.map(player => {
            const isSelected = selected.find(p => p.uid === player.uid);
            const inTeam = teams.some(t => t.includes(player.name));
            return (
              <div key={player.uid} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: radii.md, marginBottom: 6,
                border: `1.5px solid ${isSelected ? colors.baseline : colors.courtDeep}`,
                background: isSelected ? '#EBF5FF' : '#fff',
                cursor: 'pointer', transition: 'all 0.1s',
              }}>
                <div onClick={() => toggleSelect(player)} style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: colors.baseline }}>
                    {isSelected && '✓ '}{player.name}
                  </div>
                  {inTeam && (
                    <div style={{ fontSize: 10, color: colors.net, marginTop: 1 }}>
                      Already in a team
                    </div>
                  )}
                </div>
                <button onClick={() => addToSingles(player)}
                  style={{ ...btn.ghost, padding: '3px 8px', fontSize: 10, marginLeft: 8 }}>
                  + Singles
                </button>
              </div>
            );
          })}

          {/* Create team button */}
          <button onClick={createTeam} disabled={selected.length !== 2}
            style={{ ...btn.primary, width: '100%', marginTop: 12 }}>
            {selected.length === 2
              ? `Create Team: ${selected[0].name}/${selected[1].name}`
              : `Select 2 players (${selected.length}/2)`}
          </button>
        </div>

        {/* Right: Doubles teams */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.baseline, marginBottom: 8 }}>
            Doubles Teams ({teams.length})
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
            Created teams for this league
          </div>

          {teams.length === 0 ? (
            <div style={{ fontSize: 13, color: colors.textMuted,
              textAlign: 'center', padding: '32px 16px',
              border: `1px dashed ${colors.courtDeep}`, borderRadius: radii.md }}>
              No teams yet
            </div>
          ) : teams.map(team => (
            <div key={team} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: radii.md, marginBottom: 6,
              background: '#fff', border: `1px solid ${colors.courtDeep}` }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: colors.baseline }}>
                👥 {team}
              </div>
              <button onClick={() => removeTeam(team)}
                style={{ ...btn.danger, padding: '3px 8px', fontSize: 11 }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
