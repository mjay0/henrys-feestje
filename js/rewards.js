// Beloningen: speakers (vrijspelen met watts) en de Henry-familie.
import * as store from './store.js';
import { MAX_BOX } from './engine.js';
import { SONGS } from './songs.js';
import { speakerSVG } from './art.js';

// Van klein naar groot, elke stap duidelijk groter. `w` = totaal benodigde watts.
// tier 1-6 bepaalt de klank (bas) in music.js. hex = nieuw 2026-ontwerp met schuine hoeken.
// shape: compact | tower ; woofers: 1 of 2 ; lights: strobe | panel
export const SPEAKERS = [
  { id: 'encore-2', name: 'PartyBox Encore 2', watt: 100, w: 0, shape: 'compact', woofers: 1, lights: 'strobe', tier: 1, light: 2 },
  { id: 'pb-130', name: 'PartyBox 130', watt: 200, w: 1500, shape: 'compact', woofers: 1, lights: 'strobe', tier: 2, tall: true, hex: true, light: 3 },
  { id: 'pb-330', name: 'PartyBox 330', watt: 280, w: 5000, shape: 'tower', woofers: 2, lights: 'strobe', tier: 3, wheels: true, hex: true, light: 4 },
  { id: 'pb-520', name: 'PartyBox 520', watt: 400, w: 12000, shape: 'tower', woofers: 2, lights: 'panel', tier: 4, wheels: true, light: 4 },
  { id: 'pb-720', name: 'PartyBox 720', watt: 800, w: 25000, shape: 'tower', woofers: 2, lights: 'panel', tier: 5, wheels: true, big: true, light: 5 },
  { id: 'ultimate', name: 'PartyBox Ultimate', watt: 1100, w: 45000, shape: 'tower', woofers: 2, lights: 'panel', tier: 6, wheels: true, big: true, pads: true, light: 6 },
];

// Oude speakers (van vóór de opschoning) -> de nieuwe die er het meest op lijkt.
const OLD = {
  'encore-essential-2': 'encore-2', 'on-the-go-2-plus': 'encore-2',
  'club-120': 'pb-130', 'pb-110': 'pb-130',
  'pb-310': 'pb-330', 'stage-320': 'pb-330',
  'pb-710': 'pb-720', 'pb-1000': 'pb-720',
};

export const speaker = (id) => SPEAKERS.find((s) => s.id === (OLD[id] || id)) || SPEAKERS[0];

// Zet een opgeslagen oude speaker om; is die nog niet vrij, dan de grootste die wel vrij is.
export function migrateSpeaker() {
  const s = store.get();
  if (SPEAKERS.some((x) => x.id === s.speaker)) return;
  let sp = speaker(s.speaker);
  if (s.watts < sp.w) sp = [...SPEAKERS].reverse().find((x) => s.watts >= x.w) || SPEAKERS[0];
  if (s.lights[s.speaker] && !s.lights[sp.id]) s.lights[sp.id] = s.lights[s.speaker];
  s.speaker = sp.id;
  store.save();
}

// De Ultimate werkt (net als echt) alleen met een stekker: nooit leeg.
export const isPlug = (s) => s.id === 'ultimate';
// Hoe lang een volle batterij muziek kan maken (seconden): groter = langer.
export const capacity = (s) => ({ 1: 360, 2: 400, 3: 460, 4: 530, 5: 600 }[s.tier] || 600);

// Speakerkaart: balkjes van 1 t/m 6.
export function stats(s) {
  return {
    bas: s.tier,
    licht: s.light,
    batterij: isPlug(s) ? 6 : s.tier,
  };
}

export const lightsOf = (id) => store.get().lights[id] || 'regenboog';
export function speakerArt(s) { return speakerSVG(s, lightsOf(s.id)); }
export const activeSpeaker = () => speaker(store.get().speaker);
export const isUnlocked = (s) => store.get().watts >= s.w;
export const nextSpeaker = () => SPEAKERS.find((s) => !isUnlocked(s)) || null;

// Geeft de speakers terug die door deze watts nieuw zijn vrijgespeeld.
export function addWatts(n) {
  const s = store.get();
  const before = s.watts;
  s.watts += n;
  return SPEAKERS.filter((sp) => sp.w > before && sp.w <= s.watts);
}

// Nummers: gaan open met watts, net als speakers.
export const songUnlocked = (s) => store.get().watts >= s.w;

// Geeft nummers terug die vrij zijn maar nog niet getoond.
export function newSongs() {
  const st = store.get();
  const fresh = SONGS.filter((s) => songUnlocked(s) && !st.seenSongs.includes(s.id));
  fresh.forEach((s) => st.seenSongs.push(s.id));
  return fresh;
}

// Kamers voor de Stofzuig-Race: gaan open na een aantal races.
export const ROOMS = [
  { id: 'woonkamer', name: 'Woonkamer', emoji: '🛋️', races: 0, speed: 22, balls: 4 },
  { id: 'keuken', name: 'Keuken', emoji: '🍳', races: 2, speed: 36, balls: 4 },
  { id: 'slaapkamer', name: 'Slaapkamer', emoji: '🛏️', races: 4, speed: 46, balls: 5 },
  { id: 'disco', name: 'Disco', emoji: '🪩', races: 6, speed: 56, balls: 5 },
];
export const roomOpen = (r) => store.get().race.played >= r.races;
export const room = (id) => ROOMS.find((r) => r.id === id && roomOpen(r)) || ROOMS[0];

// Cijfer-modus: na 3 races en een keer 10 of meer goed in één race.
export const DIGITS_HOW = 'Speel 3 races en haal 10 goed in één race';
export const digitsOpen = () => store.get().race.played >= 3 && store.get().race.bestAny >= 10;

export const HENRYS = [
  { id: 'henry', name: 'Henry', color: '#d7262e', how: 'Altijd erbij' },
  { id: 'hetty', name: 'Hetty', color: '#ec5fa5', how: 'Haal je dagdoel (15 minuten)' },
  { id: 'george', name: 'George', color: '#2e9b45', how: '3 dagen op rij je dagdoel' },
  // id blijft 'james' zodat bewaarde voortgang klopt; de naam is Harry (James is de kat).
  { id: 'james', name: 'Harry', color: '#f2c300', how: 'Maak een tafel helemaal goud' },
  { id: 'charles', name: 'Charles', color: '#2a64c8', how: '25 goed in de Turbo-Minuut' },
];

export const henry = (id) => HENRYS.find((h) => h.id === id) || HENRYS[0];
export const activeHenry = () => henry(store.get().henry);

// Controleer alle Henry-voorwaarden; geeft nieuw vrijgespeelde Henry's terug.
export function checkHenrys() {
  const s = store.get();
  const bestTurbo = Math.max(0, ...Object.values(s.records));
  const box = (k) => (s.mastery[k] ? s.mastery[k].box : 0);
  const goldTable = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((t) =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((n) => box(`t${t}x${n}`) >= MAX_BOX));
  const earned = {
    hetty: s.goalDays >= 1,
    george: s.streak.count >= 3,
    james: goldTable,
    charles: bestTurbo >= 25,
  };
  const fresh = HENRYS.filter((h) => earned[h.id] && !s.henrys.includes(h.id));
  fresh.forEach((h) => s.henrys.push(h.id));
  return fresh;
}
