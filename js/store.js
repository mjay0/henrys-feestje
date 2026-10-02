// Alle voortgang staat lokaal op het apparaat (localStorage).
const KEY = 'henrys-feestje';
const VERSION = 1;

const fresh = () => ({
  version: VERSION,
  created: Date.now(),
  soundcheckDone: false,
  watts: 0,              // totaal ooit verdiend, bepaalt welke speakers vrij zijn
  mastery: {},           // sleutel -> { box, seen, ok, ms }
  unlockedSkills: {},    // module-id -> aantal vrijgespeelde stappen
  records: {},           // pool-id -> beste Turbo-Minuut score
  speaker: 'encore-essential-2',
  henry: 'henry',
  henrys: ['henry'],
  days: {},              // 'JJJJ-MM-DD' -> seconden geoefend
  streak: { last: null, count: 0 },
  goalDays: 0,
  song: 'house',           // gekozen feestnummer (DJ)
  seenSongs: ['house', 'stomp', 'techno'],
  race: { played: 0, best: {}, bestAny: 0 },
  raceRoom: 'woonkamer',
  raceDigits: false,       // Cijfer-modus aan/uit
  settings: { sound: true, music: true },
});

let state = fresh();

function migrate(s) {
  const base = fresh();
  return {
    ...base,
    ...s,
    settings: { ...base.settings, ...(s.settings || {}) },
    race: { ...base.race, ...(s.race || {}) },
    version: VERSION,
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : fresh();
  } catch {
    state = fresh();
  }
  try { navigator.storage?.persist?.(); } catch {}
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function reset() {
  state = fresh();
  save();
}

export const get = () => state;

export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const GOAL_SECONDS = 15 * 60;

export const secondsToday = () => state.days[today()] || 0;

// Telt oefentijd op; geeft true terug op het moment dat het dagdoel gehaald wordt.
export function addPlayTime(seconds) {
  const t = today();
  const before = state.days[t] || 0;
  state.days[t] = before + seconds;
  if (before < GOAL_SECONDS && state.days[t] >= GOAL_SECONDS) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    state.streak.count = state.streak.last === today(y) ? state.streak.count + 1 : 1;
    state.streak.last = t;
    state.goalDays++;
    save();
    return true;
  }
  return false;
}

// Een reeks telt nog zolang het doel gisteren of vandaag gehaald is.
export function currentStreak() {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return state.streak.last === today() || state.streak.last === today(y) ? state.streak.count : 0;
}
