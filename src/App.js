import React, { useState, useEffect, useCallback } from 'react';
import { RegistrationGate, RegistrationManager, DoublesTeamBuilder } from './Registration';
import { auth, signInWithGoogle, signOutUser, dbGet, dbSet, dbUpdate, dbListen,
         getAllLeagues, createLeague, settingsPath, playersPath, groupsPath,
         matchesPath, matchPath, usersPath } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { colors, fonts, btn, radii, shadows, googleFontsUrl } from './theme';

// ─── Constants ─────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "deepcolour@gmail.com";

// ─── Utility ───────────────────────────────────────────────────────────────
const toArr = v => !v ? [] : Array.isArray(v) ? v : Object.values(v);
const toObj = v => !v ? {} : (Array.isArray(v) ? Object.fromEntries(v.map((x,i)=>[i,x])) : v);

function scoreWinner(sa, sb) {
  if (!sa || !sb) return null;
  const aSets = sa.trim().split(' '), bSets = sb.trim().split(' ');
  let wa = 0, wb = 0;
  for (let i = 0; i < aSets.length; i++) {
    const [ga, gb] = aSets[i].split('-').map(Number);
    if (ga > gb) wa++; else wb++;
  }
  return wa > wb ? 'a' : 'b';
}

// ─── Styles ────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: '100vh',
    background: colors.court,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  header: {
    background: colors.baseline,
    padding: '0 20px',
    boxShadow: '0 2px 12px rgba(27,45,91,0.15)',
  },
  headerInner: {
    maxWidth: 960,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  logo: {
    fontFamily: fonts.display,
    fontWeight: 800,
    fontSize: 20,
    color: colors.gold,
    letterSpacing: 0.5,
  },
  logoSub: {
    fontSize: 10,
    color: colors.courtDeep,
    fontFamily: fonts.body,
    fontWeight: 500,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  main: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px',
  },
  card: {
    background: colors.chalk,
    borderRadius: radii.lg,
    boxShadow: shadows.card,
    padding: '20px 24px',
    marginBottom: 16,
  },
  tab: (active) => ({
    padding: '8px 18px',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    cursor: 'pointer',
    fontFamily: fonts.body,
    fontWeight: active ? 700 : 400,
    fontSize: 13,
    background: active ? colors.chalk : 'transparent',
    color: active ? colors.baseline : 'rgba(255,255,255,0.6)',
    transition: 'all 0.15s',
  }),
  pill: (active) => ({
    padding: '7px 18px',
    border: 'none',
    borderRadius: 20,
    cursor: 'pointer',
    fontFamily: fonts.body,
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    background: active ? colors.baseline : colors.courtDeep,
    color: active ? '#fff' : colors.textSecondary,
    transition: 'all 0.15s',
  }),
  liveTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: '#FEE2E2',
    color: colors.live,
    borderRadius: 20,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  champBanner: {
    background: `linear-gradient(135deg, #1a1000, #2d1f00)`,
    border: `2px solid ${colors.gold}`,
    borderRadius: radii.lg,
    padding: '24px',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreBox: {
    fontFamily: fonts.mono,
    fontWeight: 700,
    fontSize: 18,
    color: colors.baseline,
    letterSpacing: 1,
  },
  guestBanner: {
    background: colors.baseline,
    color: '#fff',
    padding: '10px 20px',
    textAlign: 'center',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
};

// ─── Loading Screen ────────────────────────────────────────────────────────
function LoadingScreen({message="Loading…"}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',height:'100vh',background:colors.court,gap:16}}>
      <div style={{fontFamily:fonts.display,fontSize:28,fontWeight:800,color:colors.baseline}}>
        🎾 GrandSlam
      </div>
      <div style={{color:colors.textMuted,fontSize:14}}>{message}</div>
    </div>
  );
}

// ─── Login Page ────────────────────────────────────────────────────────────
function LoginPage({onGuest}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try { await signInWithGoogle(); }
    catch(e) { setError('Sign in failed. Please try again.'); setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:colors.court,display:'flex',
      alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{...S.card,maxWidth:400,width:'100%',textAlign:'center',padding:'40px 32px'}}>
        {/* Logo */}
        <div style={{marginBottom:32}}>
          <div style={{fontSize:48,marginBottom:12}}>🎾</div>
          <div style={{fontFamily:fonts.display,fontWeight:800,fontSize:32,
            color:colors.baseline,lineHeight:1.1}}>GrandSlam</div>
          <div style={{fontSize:12,color:colors.textMuted,letterSpacing:3,
            textTransform:'uppercase',marginTop:6,fontWeight:500}}>Tennis League</div>
        </div>

        {/* Court line divider */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:32}}>
          <div style={{flex:1,height:1,background:colors.courtDeep}}/>
          <div style={{fontSize:11,color:colors.textMuted,fontWeight:600,
            letterSpacing:2,textTransform:'uppercase'}}>Sign in to play</div>
          <div style={{flex:1,height:1,background:colors.courtDeep}}/>
        </div>

        {/* Google Sign In */}
        <button onClick={handleGoogle} disabled={loading} style={{
          ...btn.primary,
          width:'100%',
          padding:'14px 20px',
          fontSize:15,
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          gap:10,
          marginBottom:12,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#fff" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"/>
            <path fill="#fff" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
            <path fill="#fff" d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"/>
            <path fill="#fff" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
          </svg>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && <div style={{color:colors.live,fontSize:12,marginBottom:12}}>{error}</div>}

        {/* Divider */}
        <div style={{display:'flex',alignItems:'center',gap:12,margin:'16px 0'}}>
          <div style={{flex:1,height:1,background:colors.courtDeep}}/>
          <div style={{fontSize:11,color:colors.textMuted}}>or</div>
          <div style={{flex:1,height:1,background:colors.courtDeep}}/>
        </div>

        {/* Guest mode */}
        <button onClick={onGuest} style={{
          ...btn.ghost,
          width:'100%',
          padding:'12px 20px',
          fontSize:14,
        }}>
          👁 Watch as Guest
        </button>
        <div style={{fontSize:11,color:colors.textMuted,marginTop:8}}>
          View live scores and standings without signing in
        </div>
      </div>
    </div>
  );
}

// ─── League Selector ───────────────────────────────────────────────────────
function LeagueSelector({user, guestMode, onSelect, onCreateLeague}) {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllLeagues().then(l => { setLeagues(l); setLoading(false); });
  }, []);

  if (loading) return <LoadingScreen message="Finding leagues…"/>;

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.headerInner}>
          <div>
            <div style={S.logo}>🎾 GrandSlam</div>
            <div style={S.logoSub}>Tennis League</div>
          </div>
          {user && (
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>
                {user.displayName || user.email}
              </span>
              <button onClick={signOutUser} style={{...btn.ghost,
                color:'rgba(255,255,255,0.5)',borderColor:'rgba(255,255,255,0.2)',
                padding:'5px 12px',fontSize:12}}>
                Sign out
              </button>
            </div>
          )}
          {guestMode && (
            <span style={{fontSize:12,color:colors.gold,fontWeight:600}}>
              👁 Guest
            </span>
          )}
        </div>
      </div>

      <div style={S.main}>
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:fonts.display,fontWeight:800,fontSize:28,
            color:colors.baseline,marginBottom:6}}>
            Choose a League
          </div>
          <div style={{fontSize:14,color:colors.textMuted}}>
            {guestMode ? 'Watching as guest — select a league to view live scores and standings'
              : 'Select a league to join or manage'}
          </div>
        </div>

        {(() => {
          // Guests only see public leagues; logged-in users see all
          const visibleLeagues = guestMode
            ? leagues.filter(l => l.isPublic !== false)
            : leagues;

          return visibleLeagues.length === 0 ? (
            <div style={{...S.card,textAlign:'center',padding:'48px 24px'}}>
              <div style={{fontSize:40,marginBottom:12}}>🎾</div>
              <div style={{fontWeight:700,color:colors.baseline,marginBottom:8}}>
                {guestMode ? 'No public leagues available' : 'No leagues yet'}
              </div>
              <div style={{color:colors.textMuted,fontSize:13,marginBottom:24}}>
                {guestMode
                  ? 'Ask your league manager for a direct link to watch matches'
                  : 'Create the first league to get started'}
              </div>
              {!guestMode && (
                <button onClick={onCreateLeague} style={{...btn.primary}}>
                  + Create League
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16,marginBottom:24}}>
                {visibleLeagues.map(league => (
                  <div key={league.id} onClick={()=>onSelect(league.id)}
                    style={{...S.card,cursor:'pointer',transition:'all 0.15s',
                      borderLeft:`4px solid ${colors.clay}`}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow=shadows.cardHover}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow=shadows.card}>
                    <div style={{fontFamily:fonts.display,fontWeight:700,fontSize:18,
                      color:colors.baseline,marginBottom:4}}>{league.name}</div>
                    <div style={{fontSize:12,color:colors.textMuted,marginBottom:12}}>
                      {league.seasonStart && league.seasonEnd
                        ? `${league.seasonStart} – ${league.seasonEnd}`
                        : 'Season dates TBD'}
                    </div>
                    <div style={{fontSize:12,color:colors.net,fontWeight:600}}>
                      Tap to {guestMode ? 'watch' : 'enter'} →
                    </div>
                  </div>
                ))}
              </div>
              {!guestMode && (
                <button onClick={onCreateLeague} style={{...btn.secondary}}>
                  + Create New League
                </button>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Create League Form ────────────────────────────────────────────────────
function CreateLeagueForm({user, onCreated, onCancel}) {
  const [form, setForm] = useState({
    name: '',
    seasonStart: '',
    seasonEnd: '',
    format: 'groups', // groups | round-robin
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('League name is required'); return; }
    setLoading(true);
    try {
      const leagueId = form.name.toLowerCase().replace(/[^a-z0-9]/g,'-') + '-' + Date.now();
      await createLeague(leagueId, {
        name: form.name.trim(),
        seasonStart: form.seasonStart,
        seasonEnd: form.seasonEnd,
        format: form.format,
      }, user.email.toLowerCase());
      onCreated(leagueId);
    } catch(e) {
      setError('Failed to create league. Please try again.');
      setLoading(false);
    }
  };

  const field = (label, key, type='text', placeholder='') => (
    <div style={{marginBottom:16}}>
      <label style={{display:'block',fontSize:12,fontWeight:600,
        color:colors.textSecondary,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>
        {label}
      </label>
      <input type={type} placeholder={placeholder}
        value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
        style={{width:'100%',padding:'10px 14px',border:`1.5px solid ${colors.courtDeep}`,
          borderRadius:radii.md,fontFamily:fonts.body,fontSize:14,
          background:colors.chalk,color:colors.textPrimary,boxSizing:'border-box',
          outline:'none'}}/>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:colors.court,display:'flex',
      alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{...S.card,maxWidth:440,width:'100%',padding:'32px'}}>
        <div style={{fontFamily:fonts.display,fontWeight:800,fontSize:24,
          color:colors.baseline,marginBottom:24}}>Create League</div>

        {field('League Name', 'name', 'text', 'e.g. Tristate Tennis 2027')}
        {field('Season Start', 'seasonStart', 'text', 'e.g. May 1, 2027')}
        {field('Season End', 'seasonEnd', 'text', 'e.g. July 5, 2027')}

        {error && <div style={{color:colors.live,fontSize:12,marginBottom:12}}>{error}</div>}

        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button onClick={handleCreate} disabled={loading} style={{...btn.primary,flex:1}}>
            {loading ? 'Creating…' : 'Create League'}
          </button>
          <button onClick={onCancel} style={{...btn.secondary}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [authState, setAuthState] = useState('checking'); // checking | loggedIn | loggedOut
  const [user, setUser] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [screen, setScreen] = useState('leagues'); // leagues | createLeague | league

  // Check URL for direct league link: ?league=leagueId
  const urlLeagueId = new URLSearchParams(window.location.search).get('league');
  const [activeLeagueId, setActiveLeagueId] = useState(urlLeagueId || null);

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthState(u ? 'loggedIn' : 'loggedOut');
      if (u) setGuestMode(false);
    });
  }, []);

  // If URL has a league ID, go straight to that league
  useEffect(() => {
    if (urlLeagueId) setScreen('league');
  }, [urlLeagueId]);

  const goToLeague = (id) => {
    setActiveLeagueId(id);
    setScreen('league');
    // Update URL without page reload
    window.history.pushState({}, '', `?league=${id}`);
  };

  const goBack = () => {
    setActiveLeagueId(null);
    setScreen('leagues');
    window.history.pushState({}, '', window.location.pathname);
  };

  if (authState === 'checking') return <LoadingScreen/>;

  // If URL has league ID and user is not logged in → show login with guest option
  // pointing directly to that league
  if (authState === 'loggedOut' && !guestMode) {
    return <LoginPage
      onGuest={() => { setGuestMode(true); if (urlLeagueId) setScreen('league'); }}
    />;
  }

  if (screen === 'createLeague') {
    return <CreateLeagueForm
      user={user}
      onCreated={(id) => goToLeague(id)}
      onCancel={() => setScreen('leagues')}
    />;
  }

  if (screen === 'league' && activeLeagueId) {
    return <LeagueApp
      leagueId={activeLeagueId}
      user={user}
      guestMode={guestMode}
      onBack={goBack}
    />;
  }

  return <LeagueSelector
    user={user}
    guestMode={guestMode}
    onSelect={(id) => goToLeague(id)}
    onCreateLeague={() => setScreen('createLeague')}
  />;
}

// ─── League App (the main per-league experience) ───────────────────────────
function LeagueApp({leagueId, user, guestMode, onBack}) {
  const [tab, setTab] = useState('scores');
  const [lg, setLg] = useState('doubles'); // doubles | singles
  const [settings, setSettings] = useState(null);
  const [players, setPlayers] = useState({doubles:[], singles:[]});
  const [groups, setGroups] = useState({doubles:{A:[],B:[]},singles:{A:[],B:[]}});
  const [matches, setMatches] = useState({doubles:{}, singles:{}});
  const [status, setStatus] = useState('loading');
  const [registrationStatus, setRegistrationStatus] = useState('checking'); // checking | registered | unregistered
  const [registeredName, setRegisteredName] = useState('');

  const isManager = !guestMode && user &&
    (settings?.managers||[]).includes(user.email?.toLowerCase());
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Load league data
  useEffect(() => {
    if (!leagueId) return;
    const unsubs = [];

    unsubs.push(dbListen(`leagues/${leagueId}/settings`, d => {
      setSettings(d);
      setStatus('ok');
    }));
    unsubs.push(dbListen(`leagues/${leagueId}/players`, d => {
      setPlayers({
        doubles: toArr(d?.doubles),
        singles: toArr(d?.singles),
      });
    }));
    unsubs.push(dbListen(`leagues/${leagueId}/groups`, d => {
      setGroups(d || {doubles:{A:[],B:[]},singles:{A:[],B:[]}});
    }));
    unsubs.push(dbListen(`leagues/${leagueId}/matches`, d => {
      setMatches({
        doubles: toObj(d?.doubles),
        singles: toObj(d?.singles),
      });
    }));

    // Check registration status for logged-in non-guest users
    if (user && !guestMode) {
      unsubs.push(dbListen(`leagues/${leagueId}/registrations/${user.uid}`, reg => {
        if (!reg) { setRegistrationStatus('unregistered'); return; }
        if (reg.status === 'approved') {
          setRegistrationStatus('registered');
          setRegisteredName(reg.name);
        } else {
          setRegistrationStatus(reg.status); // pending or rejected
        }
      }));
    } else {
      setRegistrationStatus('guest');
    }

    return () => unsubs.forEach(u => u());
  }, [leagueId, user, guestMode]);

  if (status === 'loading') return <LoadingScreen message="Loading league…"/>;

  // Show registration gate for non-managers who aren't registered yet
  if (!guestMode && user && !isManager && !isAdmin && registrationStatus !== 'registered') {
    return <RegistrationGate
      leagueId={leagueId}
      user={user}
      leagueName={settings?.name || 'this league'}
      onRegistered={(name) => { setRegisteredName(name); setRegistrationStatus('registered'); }}
    />;
  }

  const currentMatches = toArr(matches[lg]);
  const done = currentMatches.filter(m => m.done);
  const pending = currentMatches.filter(m => !m.done);

  const tabs = guestMode
    ? [['scores','🎯 Scores'],['leaderboard','🏆 Standings']]
    : [['scores','🎯 Scores'],['schedule','📅 Schedule'],['leaderboard','🏆 Standings'],
       ['polls','🗳️ Polls'],['banter','💬 Banter'],
       ...(isManager||isAdmin ? [['manage','⚙️ Manage']] : [])];

  return (
    <div style={S.app}>
      {/* Guest banner */}
      {guestMode && (
        <div style={S.guestBanner}>
          <span>👁 Viewing as guest</span>
          <button onClick={()=>window.location.reload()} style={{
            ...btn.ghost,padding:'4px 12px',fontSize:12,
            color:'#fff',borderColor:'rgba(255,255,255,0.3)'}}>
            Sign in to participate
          </button>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div>
            <button onClick={onBack} style={{background:'none',border:'none',
              color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:12,
              padding:0,marginBottom:2}}>
              ← All Leagues
            </button>
            <div style={S.logo}>{settings?.name || 'League'}</div>
            {settings?.seasonStart && (
              <div style={S.logoSub}>{settings.seasonStart} – {settings.seasonEnd}</div>
            )}
          </div>
          {user && !guestMode && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
              <button onClick={signOutUser} style={{...btn.ghost,
                color:'rgba(255,255,255,0.4)',borderColor:'rgba(255,255,255,0.15)',
                padding:'4px 10px',fontSize:11}}>
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{maxWidth:960,margin:'0 auto',display:'flex',gap:2,
          paddingLeft:16,overflowX:'auto'}}>
          {tabs.map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={S.tab(tab===id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={S.main}>
        {/* League/Doubles toggle */}
        {tab !== 'manage' && tab !== 'banter' && tab !== 'polls' && (
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {[['doubles','👥 Doubles'],['singles','👤 Singles']].map(([id,label])=>(
              <button key={id} onClick={()=>setLg(id)} style={S.pill(lg===id)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Scores tab */}
        {tab==='scores' && (
          <ScoresTab
            leagueId={leagueId}
            lg={lg}
            matches={currentMatches}
            done={done}
            pending={pending}
            players={players[lg]}
            isManager={isManager}
            guestMode={guestMode}
          />
        )}

        {/* Standings tab */}
        {tab==='leaderboard' && (
          <StandingsTab
            lg={lg}
            matches={currentMatches}
            groups={groups[lg]}
            players={players[lg]}
          />
        )}

        {/* Manage tab */}
        {tab==='manage' && (isManager||isAdmin) && (
          <ManageTab
            leagueId={leagueId}
            players={players}
            groups={groups}
            settings={settings}
            isAdmin={isAdmin}
            data={{matches, players, groups}}
          />
        )}

        {/* Coming soon tabs */}
        {(tab==='schedule'||tab==='polls'||tab==='banter') && (
          <div style={{...S.card,textAlign:'center',padding:'48px 24px'}}>
            <div style={{fontSize:32,marginBottom:12}}>🚧</div>
            <div style={{fontWeight:700,color:colors.baseline,marginBottom:8}}>Coming Soon</div>
            <div style={{color:colors.textMuted,fontSize:13}}>
              {tab==='schedule' ? 'Schedule & availability coordination'
                : tab==='polls' ? 'League polls and voting'
                : 'Team banter and chat'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scores Tab ────────────────────────────────────────────────────────────
function ScoresTab({leagueId, lg, matches, done, pending, players, isManager, guestMode}) {
  const [modal, setModal] = useState(null); // null | 'addMatch' | 'enterScore'
  const [form, setForm] = useState({});

  const saveMatch = async () => {
    if (!form.a || !form.b) return;
    const matchId = `${lg[0]}${Date.now()}`;
    await dbSet(matchPath(leagueId, lg, matchId), {
      id: matchId,
      a: form.a, b: form.b,
      date: form.date || '',
      time: form.time || '',
      venue: form.venue || '',
      sa: '', sb: '',
      done: false,
      createdAt: Date.now(),
    });
    setModal(null);
    setForm({});
  };

  const saveScore = async () => {
    if (!form.sa || !form.sb) return;
    await dbUpdate(matchPath(leagueId, lg, form.id), {
      sa: form.sa, sb: form.sb,
      done: true,
      completedAt: Date.now(),
    });
    setModal(null);
    setForm({});
  };

  const deleteMatch = async (matchId) => {
    if (!window.confirm('Delete this match?')) return;
    await dbSet(matchPath(leagueId, lg, matchId), null);
  };

  return (
    <div>
      {/* Header row */}
      <div style={{display:'flex',justifyContent:'space-between',
        alignItems:'center',marginBottom:16}}>
        <div style={{fontWeight:700,color:colors.baseline,fontSize:16}}>Match Results</div>
        {isManager && (
          <button onClick={()=>{setModal('addMatch');setForm({a:'',b:'',date:'',time:'',venue:'',});}}
            style={btn.primary}>
            + Add Match
          </button>
        )}
      </div>

      {matches.length === 0 && (
        <div style={{...S.card,textAlign:'center',padding:'48px 24px'}}>
          <div style={{fontSize:32,marginBottom:12}}>🎾</div>
          <div style={{color:colors.textMuted,fontSize:14}}>No matches yet</div>
        </div>
      )}

      {/* Pending matches */}
      {pending.length > 0 && (
        <div style={{marginBottom:24}}>
          <div style={{fontSize:11,color:colors.textMuted,textTransform:'uppercase',
            letterSpacing:1,marginBottom:10,fontWeight:600}}>Upcoming</div>
          {pending.map(m => (
            <MatchCard key={m.id} m={m} isManager={isManager}
              onScore={()=>{setModal('enterScore');setForm({...m,sa:'',sb:'',});}}
              onDelete={()=>deleteMatch(m.id)}
            />
          ))}
        </div>
      )}

      {/* Completed matches */}
      {done.length > 0 && (
        <div>
          <div style={{fontSize:11,color:colors.textMuted,textTransform:'uppercase',
            letterSpacing:1,marginBottom:10,fontWeight:600}}>Completed</div>
          {done.map(m => (
            <MatchCard key={m.id} m={m} done isManager={isManager}
              onScore={()=>{setModal('enterScore');setForm({...m});}}
              onDelete={()=>deleteMatch(m.id)}
            />
          ))}
        </div>
      )}

      {/* Add Match Modal */}
      {modal==='addMatch' && (
        <Modal title="Schedule Match" onClose={()=>setModal(null)}>
          {['a','b'].map((side,i) => (
            <div key={side} style={{marginBottom:12}}>
              <label style={labelStyle}>Player {i+1}</label>
              <select value={form[side]||''} onChange={e=>setForm(f=>({...f,[side]:e.target.value}))}
                style={inputStyle}>
                <option value="">Select…</option>
                {players.filter(p=>p!==form[side==='a'?'b':'a']).map(p=>(
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          ))}
          {[['date','Date','e.g. Jun 15'],['time','Time','e.g. 6:30pm'],
            ['venue','Venue (optional)','e.g. JFK Courts']].map(([k,l,p])=>(
            <div key={k} style={{marginBottom:12}}>
              <label style={labelStyle}>{l}</label>
              <input placeholder={p} value={form[k]||''} style={inputStyle}
                onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:20}}>
            <button onClick={saveMatch} disabled={!form.a||!form.b}
              style={{...btn.primary,flex:1}}>Schedule</button>
            <button onClick={()=>setModal(null)} style={btn.secondary}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Enter Score Modal */}
      {modal==='enterScore' && (
        <Modal title="Enter Score" onClose={()=>setModal(null)}>
          <div style={{background:colors.court,borderRadius:radii.md,
            padding:'12px 16px',textAlign:'center',marginBottom:16}}>
            <div style={{fontWeight:700,color:colors.baseline,fontSize:15}}>
              {form.a} <span style={{color:colors.textMuted,fontWeight:400}}>vs</span> {form.b}
            </div>
            {form.date && <div style={{fontSize:11,color:colors.textMuted,marginTop:3}}>
              {form.date}{form.time?` · ${form.time}`:''}
            </div>}
          </div>
          <div style={{fontSize:11,color:colors.textMuted,textAlign:'center',
            marginBottom:12}}>Sets separated by spaces — e.g. <code>6-4 3-6 7-5</code></div>
          {[['sa',form.a],['sb',form.b]].map(([k,label])=>(
            <div key={k} style={{marginBottom:12}}>
              <label style={labelStyle}>{label}</label>
              <input placeholder="e.g. 6-4 6-2" value={form[k]||''} style={inputStyle}
                onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:20}}>
            <button onClick={saveScore} disabled={!form.sa||!form.sb}
              style={{...btn.primary,flex:1}}>Save Score</button>
            <button onClick={()=>setModal(null)} style={btn.secondary}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Match Card ────────────────────────────────────────────────────────────
function MatchCard({m, done, isManager, onScore, onDelete}) {
  const winner = done ? scoreWinner(m.sa, m.sb) : null;

  return (
    <div style={{...S.card,marginBottom:10,padding:'14px 18px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        {/* Left: Player A */}
        <div style={{flex:1}}>
          <div style={{fontWeight:700,color:winner==='a'?colors.clay:colors.baseline,fontSize:14}}>
            {m.a}{winner==='a'&&' 🏆'}
          </div>
          {done && <div style={{...S.scoreBox,fontSize:15,color:winner==='a'?colors.clay:colors.textMuted}}>
            {m.sa}
          </div>}
        </div>

        {/* Center: VS + date */}
        <div style={{textAlign:'center',padding:'0 12px'}}>
          <div style={{fontSize:10,color:colors.textMuted,fontWeight:600}}>VS</div>
          {m.date && <div style={{fontSize:10,color:colors.textMuted,marginTop:2}}>{m.date}</div>}
          {m.time && <div style={{fontSize:10,color:colors.textMuted}}>{m.time}</div>}
        </div>

        {/* Right: Player B */}
        <div style={{flex:1,textAlign:'right'}}>
          <div style={{fontWeight:700,color:winner==='b'?colors.clay:colors.baseline,fontSize:14}}>
            {winner==='b'&&'🏆 '}{m.b}
          </div>
          {done && <div style={{...S.scoreBox,fontSize:15,color:winner==='b'?colors.clay:colors.textMuted}}>
            {m.sb}
          </div>}
        </div>
      </div>

      {/* Footer: venue + actions */}
      {(m.venue || isManager) && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          marginTop:10,paddingTop:8,borderTop:`1px solid ${colors.courtDeep}`}}>
          <div style={{fontSize:11,color:colors.textMuted}}>
            {m.venue && `📍 ${m.venue}`}
          </div>
          {isManager && (
            <div style={{display:'flex',gap:6}}>
              <button onClick={onScore} style={{...btn.ghost,padding:'4px 10px',fontSize:11}}>
                ✏️ {done?'Edit':'Score'}
              </button>
              <button onClick={onDelete} style={{...btn.danger,padding:'4px 10px',fontSize:11}}>
                🗑
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Standings Tab ─────────────────────────────────────────────────────────
function StandingsTab({lg, matches, groups, players}) {
  const groupA = groups?.A || [];
  const groupB = groups?.B || [];

  const calcStandings = (groupPlayers) => {
    return groupPlayers.map(name => {
      let mp=0, w=0, l=0;
      matches.forEach(m => {
        if (!m.done) return;
        if (m.a !== name && m.b !== name) return;
        mp++;
        const winner = scoreWinner(m.sa, m.sb);
        if ((winner==='a'&&m.a===name)||(winner==='b'&&m.b===name)) w++; else l++;
      });
      return {name, mp, w, l, pts: w*2};
    }).sort((a,b)=>b.pts-a.pts||b.w-a.w);
  };

  const standA = calcStandings(groupA);
  const standB = calcStandings(groupB);

  const findWinner = (nameA, nameB) => {
    const m = matches.find(m => m.done &&
      ((m.a===nameA&&m.b===nameB)||(m.a===nameB&&m.b===nameA)));
    if (!m) return null;
    const w = scoreWinner(m.sa, m.sb);
    return w==='a' ? m.a : m.b;
  };

  const sf1a = standA[0]?.name, sf1b = standB[1]?.name;
  const sf2a = standB[0]?.name, sf2b = standA[1]?.name;
  const sf1Winner = (sf1a&&sf1b) ? findWinner(sf1a, sf1b) : null;
  const sf2Winner = (sf2a&&sf2b) ? findWinner(sf2a, sf2b) : null;
  const champion = (sf1Winner&&sf2Winner) ? findWinner(sf1Winner, sf2Winner) : null;

  if (groupA.length===0 && groupB.length===0) {
    return (
      <div style={{...S.card,textAlign:'center',padding:'48px 24px'}}>
        <div style={{fontSize:32,marginBottom:12}}>📊</div>
        <div style={{color:colors.textMuted,fontSize:14}}>
          Groups not set up yet. Managers can assign players to groups in the Manage tab.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Champion banner */}
      {champion && (
        <div style={S.champBanner}>
          <div style={{fontSize:36,marginBottom:8}}>🏆</div>
          <div style={{fontSize:11,color:colors.gold,fontWeight:700,
            letterSpacing:3,textTransform:'uppercase',marginBottom:6}}>Champion</div>
          <div style={{fontFamily:fonts.display,fontSize:28,fontWeight:800,
            color:colors.gold}}>{champion}</div>
          <div style={{fontSize:12,color:'#92400e',marginTop:4}}>GrandSlam Tennis 2027</div>
        </div>
      )}

      {/* Group tables */}
      <div style={{display:'grid',
        gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20,marginBottom:24}}>
        {[['A',standA],['B',standB]].map(([grp,standings])=>(
          <div key={grp} style={S.card}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <div style={{background:colors.baseline,color:colors.gold,
                fontWeight:800,fontSize:12,padding:'3px 10px',borderRadius:20,
                letterSpacing:1}}>GROUP {grp}</div>
              <div style={{fontSize:11,color:colors.textMuted}}>Top 2 advance</div>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{fontSize:10,color:colors.textMuted,textTransform:'uppercase',
                  letterSpacing:0.5}}>
                  {['Player','MP','W','L','Pts'].map(h=>(
                    <th key={h} style={{padding:'4px 6px',
                      textAlign:h==='Player'?'left':'center',fontWeight:600}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((s,i)=>(
                  <tr key={s.name} style={{
                    background:i<2?`${colors.court}`:colors.chalk,
                    borderTop:`1px solid ${colors.courtDeep}`}}>
                    <td style={{padding:'8px 6px',fontWeight:i<2?700:400,
                      color:colors.baseline,fontSize:13}}>
                      {i<2&&<span style={{fontSize:10,background:colors.net,
                        color:'#fff',borderRadius:3,padding:'1px 4px',
                        marginRight:5,fontWeight:700}}>Q</span>}
                      {s.name}
                    </td>
                    {[s.mp,s.w,s.l,s.pts].map((v,j)=>(
                      <td key={j} style={{padding:'8px 6px',textAlign:'center',
                        fontFamily:fonts.mono,fontSize:13,
                        color:j===1?colors.won:j===2?colors.lost:
                          j===3?colors.clay:colors.textPrimary,
                        fontWeight:j===3?700:400}}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Knockout bracket */}
      {(sf1a||sf1b||sf2a||sf2b) && (
        <div style={S.card}>
          <div style={{fontSize:11,color:colors.textMuted,textTransform:'uppercase',
            letterSpacing:1,marginBottom:20,fontWeight:600}}>Knockout Stage</div>
          <div style={{display:'flex',alignItems:'center',
            justifyContent:'center',gap:0,overflowX:'auto'}}>
            {/* SF1 */}
            <KnockoutCol label="SEMI FINAL 1">
              <KnockoutBox name={sf1a} filled={!!sf1a}/>
              <KnockoutBox name={sf1b} filled={!!sf1b}/>
            </KnockoutCol>
            <KnockoutConnector winner={sf1Winner}/>
            {/* Final */}
            <KnockoutCol label="🏆 FINAL" gold>
              <KnockoutBox name={sf1Winner||'Winner SF1'} filled={!!sf1Winner} gold={!!sf1Winner}/>
              <KnockoutBox name={sf2Winner||'Winner SF2'} filled={!!sf2Winner} gold={!!sf2Winner}/>
              {champion && (
                <div style={{textAlign:'center',marginTop:8,fontSize:12,
                  color:colors.gold,fontWeight:700}}>🏆 {champion}</div>
              )}
            </KnockoutCol>
            <KnockoutConnector winner={sf2Winner} flip/>
            {/* SF2 */}
            <KnockoutCol label="SEMI FINAL 2">
              <KnockoutBox name={sf2a} filled={!!sf2a}/>
              <KnockoutBox name={sf2b} filled={!!sf2b}/>
            </KnockoutCol>
          </div>
          <div style={{textAlign:'center',fontSize:11,color:colors.textMuted,marginTop:16}}>
            1st Group A vs 2nd Group B · 1st Group B vs 2nd Group A
          </div>
        </div>
      )}
    </div>
  );
}

function KnockoutCol({label, children, gold}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',
      gap:8,minWidth:150}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1,
        color:gold?colors.gold:colors.clay,marginBottom:4}}>{label}</div>
      {children}
    </div>
  );
}

function KnockoutBox({name, filled, gold}) {
  return (
    <div style={{
      background: gold?'#2d1f00':filled?'#EBF5FF':colors.courtDeep,
      border: `1.5px solid ${gold?colors.gold:filled?colors.baseline:colors.net}`,
      borderRadius: radii.md,
      padding: '8px 14px',
      color: gold?colors.gold:filled?colors.baseline:colors.textMuted,
      fontWeight: 700,
      fontSize: 13,
      minWidth: 130,
      textAlign: 'center',
    }}>{name || '—'}</div>
  );
}

function KnockoutConnector({winner, flip}) {
  return (
    <div style={{width:40,height:2,background:winner?colors.clay:colors.courtDeep,
      marginTop:28, transform: flip?'none':'none'}}/>
  );
}

// ─── Manage Tab ────────────────────────────────────────────────────────────
function ManageTab({leagueId, players, groups, settings, isAdmin, data}) {
  const [section, setSection] = useState('registrations');

  const removePlayer = async (type, name) => {
    if (!window.confirm(`Remove "${name}"?`)) return;
    const current = toArr(players[type]);
    await dbSet(playersPath(leagueId, type), current.filter(p=>p!==name));
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grandslam-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    ['registrations','📋 Registrations'],
    ['teams','👥 Build Teams'],
    ['singles','👤 Singles'],
    ['groups','📊 Groups'],
    ['settings','⚙️ Settings'],
  ];

  return (
    <div>
      {/* Section tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {sections.map(([id,label])=>(
          <button key={id} onClick={()=>setSection(id)} style={S.pill(section===id)}>
            {label}
          </button>
        ))}
        <button onClick={exportBackup} style={{...btn.ghost,marginLeft:'auto'}}>
          ⬇️ Export Backup
        </button>
      </div>

      {/* Registrations — approve/reject players */}
      {section==='registrations' && (
        <div>
          <div style={{fontWeight:700,color:colors.baseline,fontSize:15,marginBottom:16}}>
            Player Registrations
          </div>
          <RegistrationManager leagueId={leagueId}/>
        </div>
      )}

      {/* Build doubles teams from approved players */}
      {section==='teams' && (
        <div>
          <div style={{fontWeight:700,color:colors.baseline,fontSize:15,marginBottom:4}}>
            Build Doubles Teams
          </div>
          <div style={{fontSize:13,color:colors.textMuted,marginBottom:16}}>
            Select 2 approved players to form a doubles team. Players can also be added to singles.
          </div>
          <DoublesTeamBuilder leagueId={leagueId}/>
        </div>
      )}

      {/* Singles players list */}
      {section==='singles' && (
        <div>
          <div style={{fontWeight:700,color:colors.baseline,fontSize:15,marginBottom:16}}>
            Singles Players ({toArr(players.singles).length})
          </div>
          <div style={{border:`1px solid ${colors.courtDeep}`,borderRadius:radii.md,overflow:'hidden',marginBottom:16}}>
            {toArr(players.singles).length===0 ? (
              <div style={{padding:'24px',textAlign:'center',color:colors.textMuted,fontSize:13}}>
                No singles players yet. Add them from the Build Teams tab.
              </div>
            ) : toArr(players.singles).map((name,i)=>(
              <div key={name} style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',padding:'10px 16px',
                background:i%2===0?'#fff':colors.court,
                borderBottom:`1px solid ${colors.courtDeep}`}}>
                <span style={{fontSize:13,fontWeight:500,color:colors.textPrimary}}>👤 {name}</span>
                <button onClick={()=>removePlayer('singles',name)}
                  style={{...btn.danger,padding:'3px 8px',fontSize:11}}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section==='groups' && (
        <GroupsSection leagueId={leagueId} players={players} groups={groups}/>
      )}
      {section==='settings' && (
        <SettingsSection leagueId={leagueId} settings={settings}
          currentUserEmail={user?.email?.toLowerCase()}/>
      )}
    </div>
  );
}

function PlayersSection({leagueId, players, addPlayer, removePlayer}) {
  const [newName, setNewName] = useState({doubles:'', singles:''});

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      {['doubles','singles'].map(type=>(
        <div key={type} style={S.card}>
          <div style={{fontWeight:700,color:colors.baseline,fontSize:15,marginBottom:14}}>
            {type==='doubles'?'👥 Doubles Teams':'👤 Singles Players'}
            <span style={{fontSize:12,color:colors.textMuted,fontWeight:400,marginLeft:8}}>
              ({toArr(players[type]).length})
            </span>
          </div>

          {/* Add new */}
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            <input placeholder={type==='doubles'?'e.g. Rahul/Vikram':'e.g. Rahul'}
              value={newName[type]}
              onChange={e=>setNewName(n=>({...n,[type]:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&addPlayer(type,newName[type])&&setNewName(n=>({...n,[type]:''}))}
              style={{...inputStyle,flex:1,marginBottom:0}}/>
            <button onClick={()=>{addPlayer(type,newName[type]);setNewName(n=>({...n,[type]:''}));}}
              style={{...btn.primary,padding:'8px 14px'}}>Add</button>
          </div>

          {/* Player list */}
          <div style={{border:`1px solid ${colors.courtDeep}`,borderRadius:radii.md,overflow:'hidden'}}>
            {toArr(players[type]).length===0 ? (
              <div style={{padding:'16px',textAlign:'center',color:colors.textMuted,fontSize:13}}>
                No {type==='doubles'?'teams':'players'} yet
              </div>
            ) : toArr(players[type]).map((name,i)=>(
              <div key={name} style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',padding:'10px 14px',
                background:i%2===0?colors.chalk:colors.court,
                borderBottom:`1px solid ${colors.courtDeep}`}}>
                <span style={{fontSize:13,fontWeight:500,color:colors.textPrimary}}>{name}</span>
                <button onClick={()=>removePlayer(type,name)}
                  style={{...btn.danger,padding:'3px 8px',fontSize:11}}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupsSection({leagueId, players, groups}) {
  const assign = async (type, player, group) => {
    const current = groups[type] || {A:[],B:[]};
    const newGroups = {
      A: (current.A||[]).filter(p=>p!==player),
      B: (current.B||[]).filter(p=>p!==player),
    };
    if (group) newGroups[group] = [...(newGroups[group]||[]), player];
    await dbSet(groupsPath(leagueId), {...groups, [type]: newGroups});
  };

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
      {['doubles','singles'].map(type=>(
        <div key={type} style={S.card}>
          <div style={{fontWeight:700,color:colors.baseline,fontSize:15,marginBottom:14}}>
            {type==='doubles'?'👥 Doubles Groups':'👤 Singles Groups'}
          </div>
          {toArr(players[type]).map(name=>{
            const inA = (groups[type]?.A||[]).includes(name);
            const inB = (groups[type]?.B||[]).includes(name);
            return (
              <div key={name} style={{display:'flex',justifyContent:'space-between',
                alignItems:'center',padding:'8px 0',
                borderBottom:`1px solid ${colors.courtDeep}`}}>
                <span style={{fontSize:13,fontWeight:500}}>{name}</span>
                <div style={{display:'flex',gap:6}}>
                  {['A','B',null].map(g=>(
                    <button key={g||'none'} onClick={()=>assign(type,name,g)}
                      style={{...btn.ghost,padding:'3px 10px',fontSize:11,
                        background:(!g&&!inA&&!inB)?colors.courtDeep:
                          (g==='A'&&inA)?colors.baseline:
                          (g==='B'&&inB)?colors.baseline:'transparent',
                        color:(!g&&!inA&&!inB)||((g==='A'&&inA)||(g==='B'&&inB))?
                          g?'#fff':colors.textSecondary:colors.textSecondary,
                        borderColor:colors.courtDeep}}>
                      {g||'—'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SettingsSection({leagueId, settings, currentUserEmail}) {
  const [form, setForm] = useState({isPublic: true, ...settings});
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newManager, setNewManager] = useState('');
  const [managerMsg, setManagerMsg] = useState('');

  const save = async () => {
    await dbUpdate(settingsPath(leagueId), form);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}?league=${leagueId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addManager = async () => {
    const email = newManager.trim().toLowerCase();
    if (!email) return;
    const current = form.managers || [];
    if (current.includes(email)) { setManagerMsg('Already a manager'); return; }
    const updated = [...current, email];
    await dbUpdate(settingsPath(leagueId), { managers: updated });
    setForm(f => ({...f, managers: updated}));
    setNewManager('');
    setManagerMsg(`${email} added as manager`);
    setTimeout(() => setManagerMsg(''), 3000);
  };

  const removeManager = async (email) => {
    if (email === currentUserEmail) { setManagerMsg("You can't remove yourself"); return; }
    const updated = (form.managers || []).filter(m => m !== email);
    await dbUpdate(settingsPath(leagueId), { managers: updated });
    setForm(f => ({...f, managers: updated}));
  };

  return (
    <div style={{maxWidth:480}}>
      <div style={{...S.card}}>
        <div style={{fontWeight:700,color:colors.baseline,fontSize:15,marginBottom:20}}>
          League Settings
        </div>
        {[['name','League Name'],['seasonStart','Season Start'],['seasonEnd','Season End']].map(([k,l])=>(
          <div key={k} style={{marginBottom:14}}>
            <label style={labelStyle}>{l}</label>
            <input value={form[k]||''} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
              style={inputStyle}/>
          </div>
        ))}

        {/* Public toggle */}
        <div style={{marginBottom:20,padding:'14px 16px',background:colors.court,
          borderRadius:radii.md,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontWeight:600,color:colors.baseline,fontSize:13}}>
              Public League
            </div>
            <div style={{fontSize:11,color:colors.textMuted,marginTop:2}}>
              {form.isPublic !== false
                ? 'Visible to guests in the league list'
                : 'Hidden from guests — share direct link only'}
            </div>
          </div>
          <button onClick={()=>setForm(f=>({...f,isPublic:f.isPublic===false?true:false}))}
            style={{
              width:44, height:24, borderRadius:12, border:'none', cursor:'pointer',
              background: form.isPublic !== false ? colors.baseline : colors.textMuted,
              position:'relative', transition:'background 0.2s',
            }}>
            <div style={{
              position:'absolute', top:3, width:18, height:18, borderRadius:'50%',
              background:'#fff', transition:'left 0.2s',
              left: form.isPublic !== false ? 23 : 3,
            }}/>
          </button>
        </div>

        <button onClick={save} style={{...btn.primary}}>
          {saved?'✓ Saved':'Save Settings'}
        </button>
      </div>

      {/* Managers */}
      <div style={{...S.card}}>
        <div style={{fontWeight:700,color:colors.baseline,fontSize:15,marginBottom:6}}>
          League Managers
        </div>
        <div style={{fontSize:12,color:colors.textMuted,marginBottom:14}}>
          Managers can add matches, approve registrations, and manage the league
        </div>
        {/* Current managers */}
        <div style={{marginBottom:14}}>
          {(form.managers||[]).map(email => (
            <div key={email} style={{display:'flex',justifyContent:'space-between',
              alignItems:'center',padding:'8px 12px',borderRadius:radii.md,
              background:colors.court,marginBottom:6}}>
              <div style={{fontSize:13,color:colors.baseline,fontWeight:500}}>
                {email === currentUserEmail ? `${email} (you)` : email}
              </div>
              {email !== currentUserEmail && (
                <button onClick={()=>removeManager(email)}
                  style={{...btn.danger,padding:'3px 8px',fontSize:11}}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Add manager */}
        <div style={{display:'flex',gap:8}}>
          <input
            placeholder="Enter email address"
            value={newManager}
            onChange={e=>setNewManager(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&addManager()}
            style={{...inputStyle,flex:1,marginBottom:0}}
          />
          <button onClick={addManager} style={{...btn.primary,padding:'9px 16px',whiteSpace:'nowrap'}}>
            Add
          </button>
        </div>
        {managerMsg && (
          <div style={{fontSize:12,color:colors.net,marginTop:8,fontWeight:600}}>
            {managerMsg}
          </div>
        )}
      </div>

      {/* Share link */}
      <div style={{...S.card}}>
        <div style={{fontWeight:700,color:colors.baseline,fontSize:15,marginBottom:6}}>
          Direct League Link
        </div>
        <div style={{fontSize:12,color:colors.textMuted,marginBottom:14}}>
          Share this link with players or guests to go directly to this league
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{flex:1,padding:'9px 12px',background:colors.court,
            borderRadius:radii.md,fontSize:12,color:colors.textSecondary,
            fontFamily:fonts.mono,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {shareUrl}
          </div>
          <button onClick={copyLink} style={{...btn.primary,padding:'9px 16px',whiteSpace:'nowrap'}}>
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────
function Modal({title, onClose, children}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(27,45,91,0.5)',
      display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:1000,padding:16}}>
      <div style={{...S.card,width:'100%',maxWidth:420,maxHeight:'90vh',
        overflowY:'auto',margin:0}}>
        <div style={{display:'flex',justifyContent:'space-between',
          alignItems:'center',marginBottom:20}}>
          <div style={{fontFamily:fonts.display,fontWeight:700,
            fontSize:18,color:colors.baseline}}>{title}</div>
          <button onClick={onClose} style={{background:'none',border:'none',
            fontSize:20,cursor:'pointer',color:colors.textMuted,lineHeight:1}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Shared input styles ───────────────────────────────────────────────────
const labelStyle = {
  display:'block',fontSize:11,fontWeight:600,
  color:colors.textSecondary,marginBottom:5,
  textTransform:'uppercase',letterSpacing:0.5,
};

const inputStyle = {
  width:'100%',padding:'10px 14px',
  border:`1.5px solid ${colors.courtDeep}`,
  borderRadius:radii.md,fontFamily:fonts.body,
  fontSize:14,background:colors.chalk,
  color:colors.textPrimary,boxSizing:'border-box',
  outline:'none',
};
