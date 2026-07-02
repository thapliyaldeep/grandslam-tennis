// ─── Firebase Configuration ────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getDatabase, ref, get, set, update, push, onValue, off } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB88QGvvZdqQ6XL4Lq-zTesyTYoXkvSJWQ",
  authDomain: "grandslam-tennis.firebaseapp.com",
  databaseURL: "https://grandslam-tennis-default-rtdb.firebaseio.com",
  projectId: "grandslam-tennis",
  storageBucket: "grandslam-tennis.firebasestorage.app",
  messagingSenderId: "64728199826",
  appId: "1:64728199826:web:eba47fd29f34ae9c152c4b",
  measurementId: "G-NMCPVGY0EF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// ─── Auth helpers ──────────────────────────────────────────────────────────
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signOutUser = () => signOut(auth);

// ─── Database paths ────────────────────────────────────────────────────────
// /leagues/{leagueId}/settings
// /leagues/{leagueId}/players/doubles
// /leagues/{leagueId}/players/singles
// /leagues/{leagueId}/groups
// /leagues/{leagueId}/matches/doubles/{matchId}
// /leagues/{leagueId}/matches/singles/{matchId}
// /leagues/{leagueId}/availability
// /leagues/{leagueId}/banter
// /leagues/{leagueId}/polls
// /leagues/{leagueId}/users

export const leaguePath = (leagueId) => `leagues/${leagueId}`;
export const settingsPath = (leagueId) => `leagues/${leagueId}/settings`;
export const playersPath = (leagueId, type) => `leagues/${leagueId}/players/${type}`;
export const groupsPath = (leagueId) => `leagues/${leagueId}/groups`;
export const matchesPath = (leagueId, type) => `leagues/${leagueId}/matches/${type}`;
export const matchPath = (leagueId, type, matchId) => `leagues/${leagueId}/matches/${type}/${matchId}`;
export const liveMatchPath = (leagueId, type, matchId) => `leagues/${leagueId}/live/${type}/${matchId}`;
export const usersPath = (leagueId) => `leagues/${leagueId}/users`;
export const banterPath = (leagueId) => `leagues/${leagueId}/banter`;
export const pollsPath = (leagueId) => `leagues/${leagueId}/polls`;
export const availabilityPath = (leagueId) => `leagues/${leagueId}/availability`;

// ─── Read helpers ──────────────────────────────────────────────────────────
export const dbGet = async (path) => {
  const snap = await get(ref(db, path));
  return snap.exists() ? snap.val() : null;
};

// ─── Write helpers ─────────────────────────────────────────────────────────
export const dbSet = async (path, value) => set(ref(db, path), value);
export const dbUpdate = async (path, value) => update(ref(db, path), value);
export const dbPush = async (path, value) => push(ref(db, path), value);

// ─── Real-time listener helpers ────────────────────────────────────────────
export const dbListen = (path, callback) => {
  const r = ref(db, path);
  onValue(r, (snap) => callback(snap.exists() ? snap.val() : null));
  return () => off(r); // returns unsubscribe function
};

// ─── Safety guard: never write fewer matches than already exist ────────────
export const safeUpdateMatch = async (leagueId, type, matchId, updates) => {
  const path = matchPath(leagueId, type, matchId);
  await dbUpdate(path, updates);
};

// ─── League helpers ────────────────────────────────────────────────────────
export const createLeague = async (leagueId, settings, creatorEmail) => {
  await dbSet(`leagues/${leagueId}`, {
    settings: {
      ...settings,
      createdAt: Date.now(),
      managers: [creatorEmail],
    },
    players: { doubles: [], singles: [] },
    groups: { doubles: { A: [], B: [] }, singles: { A: [], B: [] } },
    matches: { doubles: {}, singles: {} },
    live: { doubles: {}, singles: {} },
    users: {},
    banter: {},
    polls: {},
    availability: {},
  });
};

export const getAllLeagues = async () => {
  const data = await dbGet('leagues');
  if (!data) return [];
  return Object.entries(data).map(([id, league]) => ({
    id,
    ...league.settings,
  }));
};

// ─── Registration helpers ──────────────────────────────────────────────────
// /leagues/{leagueId}/registrations/{uid} = {uid, name, email, status, requestedAt}
// status: 'pending' | 'approved' | 'rejected'
export const registrationsPath = (leagueId) => `leagues/${leagueId}/registrations`;
export const registrationPath = (leagueId, uid) => `leagues/${leagueId}/registrations/${uid}`;

// Player submits registration request
// enrollment: 'singles' | 'doubles' | 'both'
export const submitRegistration = async (leagueId, user, name, enrollment = 'both') => {
  await dbSet(registrationPath(leagueId, user.uid), {
    uid: user.uid,
    name: name.trim(),
    email: user.email,
    enrollment,
    status: 'pending',
    requestedAt: Date.now(),
  });
};

// Manager approves registration — adds player to correct pools based on enrollment
export const approveRegistration = async (leagueId, uid, name, enrollment = 'both') => {
  await dbUpdate(registrationPath(leagueId, uid), {
    status: 'approved',
    approvedAt: Date.now(),
  });

  // Add to individual player pool (for doubles team building)
  if (enrollment === 'doubles' || enrollment === 'both') {
    const existing = await dbGet(individualPlayersPath(leagueId));
    const arr = existing ? Object.values(existing) : [];
    if (!arr.find(p => p.uid === uid)) {
      await dbPush(individualPlayersPath(leagueId), { uid, name, enrollment });
    }
  }

  // If singles or both — add directly to singles roster
  if (enrollment === 'singles' || enrollment === 'both') {
    const currentSingles = await dbGet(`leagues/${leagueId}/players/singles`);
    const singlesArr = currentSingles ? Object.values(currentSingles) : [];
    if (!singlesArr.includes(name)) {
      await dbSet(`leagues/${leagueId}/players/singles`, [...singlesArr, name]);
    }
  }
};

// Manager rejects registration
export const rejectRegistration = async (leagueId, uid) => {
  await dbUpdate(registrationPath(leagueId, uid), {
    status: 'rejected',
    rejectedAt: Date.now(),
  });
};

// Individual players pool — approved players not yet assigned to teams
export const individualPlayersPath = (leagueId) => `leagues/${leagueId}/individualPlayers`;
