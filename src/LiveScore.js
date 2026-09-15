import React, { useState, useEffect, useRef } from 'react';
import { dbSet, dbListen, matchPath } from './firebase';
import { colors, fonts, btn, radii } from './theme';

// ─── Constants ─────────────────────────────────────────────────────────────
const DEVICE_ID = (() => {
  let id = localStorage.getItem('gs_device_id');
  if (!id) { id = Math.random().toString(36).slice(2); localStorage.setItem('gs_device_id', id); }
  return id;
})();

// ─── Initial live state ────────────────────────────────────────────────────
function newLive(server = 'a') {
  return {
    sets: [],
    games: { a: 0, b: 0 },
    points: { a: 0, b: 0 },
    serving: server,
    initialServer: server,
    deuce: false,
    adv: null,
    isTiebreak: false,
    history: [],
    pointLog: [],
    keeperId: null,
    startTs: Date.now(),
  };
}

// ─── Point logic ───────────────────────────────────────────────────────────
function addPoint(live, side) {
  const state = JSON.parse(JSON.stringify(live));
  // Save history for undo
  const snapshot = JSON.parse(JSON.stringify(state));
  snapshot.history = [];
  state.history = [...(state.history || []).slice(-49), snapshot];

  const opp = side === 'a' ? 'b' : 'a';
  state.pointLog = [...(state.pointLog || []), {
    who: side, ts: Date.now(),
    set: state.sets.length,
    tb: !!state.isTiebreak,
  }];

  if (state.isTiebreak) {
    state.points[side]++;
    const p = state.points[side], q = state.points[opp];
    // Switch serve every 2 points in tiebreak
    if ((state.points.a + state.points.b) % 2 === 1) {
      state.serving = state.serving === 'a' ? 'b' : 'a';
    }
    if (p >= 7 && p - q >= 2) {
      // Tiebreak won
      state.sets.push({ a: state.games.a, b: state.games.b, tb: true });
      state.games = { a: 0, b: 0 };
      state.points = { a: 0, b: 0 };
      state.isTiebreak = false;
      state.deuce = false;
      state.adv = null;
      state.serving = state.initialServer === 'a' ? 'b' : 'a';
    }
    return state;
  }

  // Regular point
  if (state.deuce) {
    if (state.adv === side) {
      // Win game
      state = winGame(state, side);
    } else if (state.adv === opp) {
      state.adv = null; // back to deuce
    } else {
      state.adv = side; // advantage
    }
    return state;
  }

  state.points[side]++;
  if (state.points.a === 3 && state.points.b === 3) {
    state.deuce = true;
    state.points = { a: 3, b: 3 };
    return state;
  }
  if (state.points[side] >= 4) {
    state = winGame(state, side);
  }
  return state;
}

function winGame(state, side) {
  const opp = side === 'a' ? 'b' : 'a';
  state.games[side]++;
  state.points = { a: 0, b: 0 };
  state.deuce = false;
  state.adv = null;
  // Switch serve after each game
  state.serving = state.serving === 'a' ? 'b' : 'a';

  const g = state.games[side], q = state.games[opp];
  // Check set win
  const setWon = (g >= 6 && g - q >= 2);
  const tiebreak = (g === 6 && q === 6);

  if (tiebreak) {
    state.isTiebreak = true;
  } else if (setWon) {
    state.sets.push({ a: state.games.a, b: state.games.b });
    state.games = { a: 0, b: 0 };
  }
  return state;
}

function undoPoint(live) {
  if (!live.history || live.history.length === 0) return live;
  const prev = live.history[live.history.length - 1];
  return { ...prev, history: live.history.slice(0, -1), keeperId: live.keeperId };
}

function getScore(live) {
  const pts = ['0', '15', '30', '40'];
  if (live.isTiebreak) {
    return { a: String(live.points.a), b: String(live.points.b), tb: true };
  }
  if (live.deuce) {
    if (live.adv === 'a') return { a: 'Ad', b: '40' };
    if (live.adv === 'b') return { a: '40', b: 'Ad' };
    return { a: '40', b: '40' };
  }
  return { a: pts[live.points.a] || '0', b: pts[live.points.b] || '0' };
}

function computeWinner(live, nameA, nameB) {
  // Best of 3 sets
  let wa = 0, wb = 0;
  for (const s of live.sets) {
    if (s.a > s.b) wa++; else wb++;
  }
  if (wa >= 2) return { winner: nameA, sa: live.sets.map(s=>`${s.a}-${s.b}`).join(' '), sb: live.sets.map(s=>`${s.b}-${s.a}`).join(' ') };
  if (wb >= 2) return { winner: nameB, sa: live.sets.map(s=>`${s.a}-${s.b}`).join(' '), sb: live.sets.map(s=>`${s.b}-${s.a}`).join(' ') };
  return null;
}

// ─── Toss Screen ───────────────────────────────────────────────────────────
function TossScreen({ nameA, nameB, onResult }) {
  const [winner, setWinner] = useState('');
  const [choice, setChoice] = useState(''); // serve | receive

  const confirm = () => {
    if (!winner || !choice) return;
    const server = choice === 'serve' ? winner : (winner === 'a' ? 'b' : 'a');
    onResult(server);
  };

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: '0 auto' }}>
      <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 22,
        color: colors.baseline, textAlign: 'center', marginBottom: 24 }}>
        🎾 Coin Toss
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary,
          textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Toss winner
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['a', nameA], ['b', nameB]].map(([side, name]) => (
            <button key={side} onClick={() => setWinner(side)} style={{
              flex: 1, padding: '14px 10px', border: `2px solid ${winner === side ? colors.baseline : colors.courtDeep}`,
              borderRadius: radii.md, background: winner === side ? colors.baseline : '#fff',
              color: winner === side ? '#fff' : colors.textSecondary,
              fontFamily: fonts.body, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>{name}</button>
          ))}
        </div>
      </div>

      {winner && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.textSecondary,
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            {winner === 'a' ? nameA : nameB} chooses to…
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[['serve', '🎾 Serve'], ['receive', '↩️ Receive']].map(([c, label]) => (
              <button key={c} onClick={() => setChoice(c)} style={{
                flex: 1, padding: '12px 10px', border: `2px solid ${choice === c ? colors.clay : colors.courtDeep}`,
                borderRadius: radii.md, background: choice === c ? colors.clay : '#fff',
                color: choice === c ? '#fff' : colors.textSecondary,
                fontFamily: fonts.body, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      <button onClick={confirm} disabled={!winner || !choice}
        style={{ ...btn.primary, width: '100%', padding: '14px', fontSize: 16, marginTop: 8 }}>
        Start Match
      </button>
    </div>
  );
}

// ─── Live Score View ───────────────────────────────────────────────────────
function LiveScoreView({ m, live, isKeeper, onPoint, onUndo, onEndMatch, onClose }) {
  const score = getScore(live);
  const matchResult = computeWinner(live, m.a, m.b);

  const setsA = live.sets.map(s => s.a);
  const setsB = live.sets.map(s => s.b);

  // Current set games
  const currentA = live.games.a;
  const currentB = live.games.b;

  const ScoreCell = ({ val, serving, won }) => (
    <div style={{
      fontFamily: fonts.mono, fontWeight: 800,
      fontSize: won ? 28 : 22,
      color: won ? colors.clay : colors.baseline,
      minWidth: 32, textAlign: 'center',
      position: 'relative',
    }}>
      {serving && (
        <span style={{
          position: 'absolute', left: -14, top: '50%', transform: 'translateY(-50%)',
          width: 8, height: 8, borderRadius: '50%',
          background: colors.clay, display: 'inline-block',
        }}/>
      )}
      {val}
    </div>
  );

  return (
    <div style={{ background: colors.baseline, minHeight: '100vh',
      color: '#fff', fontFamily: fonts.body }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
            animation: 'pulse 1s infinite' }}/>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', letterSpacing: 1 }}>
            LIVE
          </span>
        </div>
        {isKeeper && !matchResult && (
          <button onClick={onUndo} style={{ background: 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer',
            padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
            ↩ Undo
          </button>
        )}
        {!isKeeper && <div style={{ width: 60 }}/>}
      </div>

      {/* Scoreboard */}
      <div style={{ padding: '24px 20px' }}>
        {/* Match info */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {live.isTiebreak && (
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2,
              color: colors.gold, textTransform: 'uppercase', marginBottom: 4 }}>
              Tiebreak
            </div>
          )}
        </div>

        {/* Score table */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: radii.lg,
          padding: '20px 24px', marginBottom: 24 }}>
          {/* Sets header */}
          {live.sets.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32,
              marginBottom: 8, paddingRight: 8 }}>
              {live.sets.map((_, i) => (
                <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)',
                  width: 24, textAlign: 'center' }}>S{i+1}</div>
              ))}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 32, textAlign: 'center' }}>
                {live.isTiebreak ? 'TB' : 'Gm'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 28, textAlign: 'center' }}>Pt</div>
            </div>
          )}

          {/* Player rows */}
          {[['a', m.a, setsA, currentA, score.a], ['b', m.b, setsB, currentB, score.b]].map(([side, name, sets, games, pts]) => {
            const setsWon = sets.filter((s, i) => s > (side === 'a' ? setsB[i] : setsA[i])).length;
            return (
              <div key={side} style={{ display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 12 }}>
                {/* Name + sets won */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{name}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: setsWon }).map((_, i) => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: '50%',
                        background: colors.gold }}/>
                    ))}
                  </div>
                </div>
                {/* Set scores */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                  {sets.map((s, i) => {
                    const opp = side === 'a' ? setsB[i] : setsA[i];
                    return (
                      <ScoreCell key={i} val={s} won={s > opp}
                        serving={false}/>
                    );
                  })}
                  {/* Current game */}
                  <ScoreCell val={games} serving={live.serving === side && !matchResult}/>
                  {/* Current point */}
                  <ScoreCell val={pts} serving={false}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Match over */}
        {matchResult ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
            <div style={{ fontFamily: fonts.display, fontWeight: 800, fontSize: 24,
              color: colors.gold, marginBottom: 4 }}>
              {matchResult.winner} wins!
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 }}>
              {matchResult.sa} · {matchResult.sb}
            </div>
            {isKeeper && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={onUndo}
                  style={{ ...btn.ghost, color: 'rgba(255,255,255,0.7)',
                    borderColor: 'rgba(255,255,255,0.2)', padding: '12px 20px' }}>
                  ↩ Undo Last Point
                </button>
                <button onClick={() => onEndMatch(matchResult)}
                  style={{ ...btn.primary, padding: '12px 24px', fontSize: 15 }}>
                  ✓ Confirm Result
                </button>
              </div>
            )}
            {!isKeeper && (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                Waiting for score keeper to confirm result…
              </div>
            )}
          </div>
        ) : isKeeper ? (
          /* Point buttons */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['a', m.a], ['b', m.b]].map(([side, name]) => (
              <button key={side} onClick={() => onPoint(side)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: `2px solid ${live.serving === side ? colors.clay : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: radii.lg,
                  padding: '28px 16px',
                  color: '#fff',
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  fontSize: 18,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.1s',
                  position: 'relative',
                }}>
                {live.serving === side && (
                  <div style={{ position: 'absolute', top: 10, right: 10,
                    fontSize: 10, color: colors.clay, fontWeight: 700, letterSpacing: 1 }}>
                    SERVING
                  </div>
                )}
                {name}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)',
                  fontWeight: 400, marginTop: 4 }}>
                  Point →
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, padding: 20 }}>
            👁 Watching live — score updates automatically
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Match Entry Point ────────────────────────────────────────────────
export function LiveMatch({ leagueId, lg, matchId, nameA, nameB, user, isManager, onClose, onMatchComplete }) {
  const [phase, setPhase] = useState('loading'); // loading | toss | scoring | watching
  const [live, setLive] = useState(null);
  const [remoteKeeperLive, setRemoteKeeperLive] = useState(null);
  const isKeeper = useRef(false);

  const livePath = `leagues/${leagueId}/live/${lg}/${matchId}`;

  // Listen to live node in Firebase
  useEffect(() => {
    const unsub = dbListen(livePath, data => {
      if (!data) {
        setPhase('toss');
        return;
      }
      setRemoteKeeperLive(data);
      if (!isKeeper.current) {
        // Watcher — always use remote state
        setLive(data);
        setPhase('scoring');
      }
    });
    return unsub;
  }, [livePath]);

  const handleTossResult = (server) => {
    const initialLive = newLive(server);
    initialLive.keeperId = DEVICE_ID;
    isKeeper.current = true;
    setLive(initialLive);
    // Write initial live state so watchers can see
    dbSet(livePath, initialLive);
    setPhase('scoring');
  };

  const handleWatchLive = () => {
    if (remoteKeeperLive) {
      setLive(remoteKeeperLive);
      setPhase('scoring');
    } else {
      setPhase('watching_no_keeper');
    }
  };

  const handlePoint = (side) => {
    if (!isKeeper.current) return;
    const newState = addPoint(live, side);
    setLive(newState);
    // Write to live node after every game won (not every point — reduces writes)
    const gameChanged = newState.games.a + newState.games.b !== live.games.a + live.games.b
      || newState.sets.length !== live.sets.length
      || newState.isTiebreak !== live.isTiebreak;
    if (gameChanged) {
      dbSet(livePath, { ...newState, keeperId: DEVICE_ID });
    }
  };

  const handleUndo = () => {
    if (!isKeeper.current || !live) return;
    const prev = undoPoint(live);
    setLive(prev);
  };

  const handleEndMatch = async (result) => {
    // Write final match result to matches node
    await dbSet(matchPath(leagueId, lg, matchId), {
      id: matchId,
      a: nameA, b: nameB,
      sa: result.sa,
      sb: result.sb,
      done: true,
      completedAt: Date.now(),
      matchStats: { ...live, history: [] }, // save stats without undo history
    });
    // Clear live node
    await dbSet(livePath, null);
    onMatchComplete();
  };

  if (phase === 'loading') {
    return (
      <div style={{ background: colors.baseline, minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  // No keeper yet — offer options
  if (phase === 'toss') {
    return (
      <div style={{ background: colors.baseline, minHeight: '100vh', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}>
            ← Back
          </button>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{nameA} vs {nameB}</div>
          <div style={{ width: 60 }}/>
        </div>

        <div style={{ padding: '32px 20px', maxWidth: 400, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            <button onClick={() => setPhase('do_toss')}
              style={{ ...btn.primary, padding: '16px', fontSize: 15, justifyContent: 'center' }}>
              🎾 I am the Score Keeper
            </button>
            <button onClick={handleWatchLive}
              style={{ ...btn.ghost, padding: '14px', fontSize: 14, color: 'rgba(255,255,255,0.7)',
                borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' }}>
              👁 Watch Live
            </button>
          </div>
        </div>

        {phase === 'do_toss' && (
          <TossScreen nameA={nameA} nameB={nameB} onResult={handleTossResult}/>
        )}
      </div>
    );
  }

  if (phase === 'do_toss') {
    return (
      <div style={{ background: colors.baseline, minHeight: '100vh', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={() => setPhase('toss')} style={{ background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 14 }}>
            ← Back
          </button>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{nameA} vs {nameB}</div>
          <div style={{ width: 60 }}/>
        </div>
        <TossScreen nameA={nameA} nameB={nameB} onResult={handleTossResult}/>
      </div>
    );
  }

  if (phase === 'watching_no_keeper') {
    return (
      <div style={{ background: colors.baseline, minHeight: '100vh', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#fff', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 32 }}>⏳</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>Waiting for score keeper</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>
          The match hasn't started yet. The score keeper will begin shortly.
        </div>
        <button onClick={onClose} style={{ ...btn.ghost, color: 'rgba(255,255,255,0.7)',
          borderColor: 'rgba(255,255,255,0.2)', marginTop: 16 }}>
          ← Back
        </button>
      </div>
    );
  }

  if (!live) return null;

  return (
    <LiveScoreView
      m={{ a: nameA, b: nameB }}
      live={live}
      isKeeper={isKeeper.current}
      onPoint={handlePoint}
      onUndo={handleUndo}
      onEndMatch={handleEndMatch}
      onClose={onClose}
    />
  );
}
