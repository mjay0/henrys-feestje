// Oefen-motor: houdt per som (of somtype) bij hoe goed die zit, en kiest
// vaker de sommen die nog niet goed of snel genoeg gaan.
import * as store from './store.js';

export const MAX_BOX = 5;          // box 5 = goud / "gemeisterd"
const WEIGHT = [10, 8, 5, 3, 2, 1]; // kans om gekozen te worden per box

export function mastery(key) {
  return store.get().mastery[key] || { box: 0, seen: 0, ok: 0, ms: 0 };
}

// jump: een som die de eerste keer meteen snel goed is, slaat een box over
// (handig voor losse feiten zoals tafels; niet voor somtypes).
export function record(key, correct, ms, fastMs, { jump = false } = {}) {
  const e = { ...mastery(key) };
  e.seen++;
  if (correct) {
    e.ok++;
    e.ms = e.ms ? Math.round(e.ms * 0.7 + ms * 0.3) : ms;
    const fast = ms <= fastMs;
    if (fast) e.box = Math.min(MAX_BOX, e.box + (jump && e.seen === 1 ? 2 : 1));
    else if (e.box < 2) e.box++;
  } else {
    e.box = Math.max(0, e.box - 2);
  }
  store.get().mastery[key] = e;
  return e;
}

// items: [{ key, make(), weight? }] -> functie die steeds een nieuwe vraag geeft.
// weight: hoe vaak een som mag komen (makkelijke sommen minder vaak).
export function makePicker(getItems) {
  const recent = [];
  return function next() {
    const items = getItems();
    let pool = items.filter((it) => !recent.includes(it.key));
    if (!pool.length) pool = items;
    const weights = pool.map((it) => WEIGHT[mastery(it.key).box] * (it.weight || 1));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    let pick = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) { pick = pool[i]; break; }
    }
    recent.push(pick.key);
    if (recent.length > Math.min(3, items.length - 1)) recent.shift();
    return pick.make();
  };
}

// Gemiddelde box (0..1) over een lijst sleutels, voor voortgangsbalken.
export function progress(keys) {
  if (!keys.length) return 0;
  return keys.reduce((s, k) => s + mastery(k).box, 0) / (keys.length * MAX_BOX);
}

export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
