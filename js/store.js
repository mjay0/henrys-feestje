// Alle voortgang staat lokaal op het apparaat (localStorage).
// Testmodus (voor ouders) gebruikt een apart profiel waarin alles open is,
// zodat Lewis' echte voortgang niet verandert.
const MODE_KEY = 'henrys-feestje-mode';
const testMode = (() => { try { return localStorage.getItem(MODE_KEY) === 'test'; } catch { return false; } })();
const KEY = testMode ? 'henrys-feestje-test' : 'henrys-feestje';
const VERSION = 1;

export const isTest = () => testMode;

export function setTestMode(on) {
  try {
    if (on) localStorage.setItem(MODE_KEY, 'test');
    else localStorage.removeItem(MODE_KEY);
  } catch {}
  location.reload();
}

// Nummers die meteen beschikbaar zijn (zonder 'nieuw nummer'-onthulling).
const FILE_SONG_IDS = ['energiek', 'acid', 'electro', 'deep', 'fashion'];
const START_SONGS = ['house', 'stomp', 'techno', ...FILE_SONG_IDS];

const fresh = () => ({
  version: VERSION,
  created: Date.now(),
  soundcheckDone: false,
  watts: 0,              // totaal ooit verdiend, bepaalt welke speakers vrij zijn
  mastery: {},           // sleutel -> { box, seen, ok, ms }
  unlockedSkills: {},    // module-id -> aantal vrijgespeelde stappen
  records: {},           // pool-id -> beste Turbo-Minuut score
  speaker: 'encore-2',
  henry: 'henry',
  henrys: ['henry'],
  days: {},              // 'JJJJ-MM-DD' -> seconden geoefend
  streak: { last: null, count: 0 },
  goalDays: 0,
  song: 'energiek',        // gekozen feestnummer (DJ)
  seenSongs: [...START_SONGS],
  race: { played: 0, best: {}, bestAny: 0 },
  raceRoom: 'woonkamer',
  raceDigits: false,       // Cijfer-modus aan/uit
  battery: {},             // speaker-id -> batterij % (ontbreekt = vol)
  lights: {},              // speaker-id -> gekozen lichtshow
  settings: { sound: true, music: true },
});

// Testprofiel: alles vrijgespeeld (speakers, nummers, kamers, Cijfer-modus, Henry's).
const freshTest = () => ({
  ...fresh(),
  soundcheckDone: true,
  watts: 100_000,
  henrys: ['henry', 'hetty', 'george', 'james', 'charles'],
  seenSongs: [...START_SONGS, 'tropisch', 'chip'],
  unlockedSkills: { plus: 5, min: 5 },
  race: { played: 10, best: {}, bestAny: 20 },
});

const initial = () => (testMode ? freshTest() : fresh());

let state = initial();

function migrate(s) {
  const base = fresh();
  // Echte MP3-nummers toegevoegd: stil vrijgeven en als feestnummer kiezen
  // als Lewis nog op het standaardnummer stond.
  if (s.seenSongs && !s.seenSongs.includes('energiek')) {
    s.seenSongs = [...s.seenSongs, ...FILE_SONG_IDS];
    if (!s.song || s.song === 'house') s.song = 'energiek';
  }
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
    state = raw ? migrate(JSON.parse(raw)) : initial();
  } catch {
    state = initial();
  }
  try { navigator.storage?.persist?.(); } catch {}
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export function reset() {
  state = initial();
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
