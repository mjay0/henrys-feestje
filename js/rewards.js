// Beloningen: speakers (vrijspelen met watts) en de Henry-familie.
import * as store from './store.js';
import { MAX_BOX } from './engine.js';

// Van klein naar groot. `w` = totaal benodigde watts.
// shape: compact | tower ; woofers: 1 of 2 ; lights: ring | strobe | panel
export const SPEAKERS = [
  { id: 'encore-essential-2', name: 'PartyBox Encore Essential 2', w: 0, shape: 'compact', woofers: 1, lights: 'ring', tier: 1 },
  { id: 'on-the-go-2-plus', name: 'PartyBox On-The-Go 2 Plus', w: 400, shape: 'compact', woofers: 1, lights: 'ring', tier: 1, strap: true },
  { id: 'encore-2', name: 'PartyBox Encore 2', w: 1000, shape: 'compact', woofers: 1, lights: 'strobe', tier: 1 },
  { id: 'club-120', name: 'PartyBox Club 120', w: 2000, shape: 'compact', woofers: 1, lights: 'strobe', tier: 2, tall: true },
  { id: 'pb-110', name: 'PartyBox 110', w: 4000, shape: 'tower', woofers: 2, lights: 'ring', tier: 2 },
  { id: 'pb-310', name: 'PartyBox 310', w: 7000, shape: 'tower', woofers: 2, lights: 'strobe', tier: 3, wheels: true },
  { id: 'stage-320', name: 'PartyBox Stage 320', w: 11000, shape: 'tower', woofers: 2, lights: 'strobe', tier: 3, wheels: true },
  { id: 'pb-520', name: 'PartyBox 520', w: 16000, shape: 'tower', woofers: 2, lights: 'panel', tier: 3, wheels: true },
  { id: 'pb-710', name: 'PartyBox 710', w: 23000, shape: 'tower', woofers: 2, lights: 'panel', tier: 4, wheels: true, big: true },
  { id: 'pb-720', name: 'PartyBox 720', w: 32000, shape: 'tower', woofers: 2, lights: 'panel', tier: 4, wheels: true, big: true },
  { id: 'pb-1000', name: 'PartyBox 1000', w: 44000, shape: 'tower', woofers: 2, lights: 'panel', tier: 4, wheels: true, big: true, pads: true },
  { id: 'ultimate', name: 'PartyBox Ultimate', w: 60000, shape: 'tower', woofers: 2, lights: 'panel', tier: 5, wheels: true, big: true, pads: true },
];

export const speaker = (id) => SPEAKERS.find((s) => s.id === id) || SPEAKERS[0];
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

export const HENRYS = [
  { id: 'henry', name: 'Henry', color: '#d7262e', how: 'Altijd erbij' },
  { id: 'hetty', name: 'Hetty', color: '#ec5fa5', how: 'Haal je dagdoel (15 minuten)' },
  { id: 'george', name: 'George', color: '#2e9b45', how: '3 dagen op rij je dagdoel' },
  { id: 'james', name: 'James', color: '#f2c300', how: 'Maak een tafel helemaal goud' },
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
