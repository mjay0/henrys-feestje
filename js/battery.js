// Batterij van de PartyBox: muziek kost stroom, Partybox Opladen laadt op.
// Elke speaker heeft zijn eigen batterij. Leeg = geen muziek.
import * as store from './store.js';
import * as music from './music.js';
import { sfx } from './audio.js';
import { h } from './ui.js';
import { activeSpeaker, speaker, isPlug, capacity } from './rewards.js';

export const PER_SUM = 100 / 24; // één Opladen-ronde (8 sommen) = een derde batterij

export function level(id = store.get().speaker) {
  if (isPlug(speaker(id))) return 100;
  const v = store.get().battery[id];
  return v === undefined ? 100 : v;
}

export const isEmpty = (id) => level(id) <= 0;

function set(id, v) {
  store.get().battery[id] = Math.max(0, Math.min(100, v));
  window.dispatchEvent(new CustomEvent('battery', { detail: { id, level: level(id) } }));
}

// Opladen: geeft het nieuwe percentage terug.
export function charge(id, pct) {
  set(id, level(id) + pct);
  return level(id);
}

let toastEl = null;
export function toast(html, cls = '') {
  toastEl?.remove();
  toastEl = h(`<div class="toast ${cls}">${html}</div>`);
  document.body.appendChild(toastEl);
  const me = toastEl;
  setTimeout(() => me.classList.add('out'), 2800);
  setTimeout(() => me.remove(), 3300);
}

function drain(seconds) {
  const sp = activeSpeaker();
  if (isPlug(sp)) return;
  const before = level(sp.id);
  if (before <= 0) return;
  const after = before - (seconds / capacity(sp)) * 100;
  set(sp.id, after);
  if (before > 20 && after <= 20) { sfx.lowBattery(); toast('🪫 PartyBox bijna leeg!', 'low'); }
  if (before > 10 && after <= 10) sfx.lowBattery();
  if (after <= 0) {
    store.save();
    music.powerDown();
    sfx.batteryEmpty();
    toast('🪫 De PartyBox is leeg! Laad hem op bij <b>🔋 Opladen</b>', 'empty');
  }
}

export function init() {
  // Geen muziek als de batterij leeg is; anders klinkt de muziek als de gekozen speaker.
  music.setGate(() => {
    const sp = activeSpeaker();
    music.setTone(sp.tier);
    return !isEmpty(sp.id);
  });
  let last = performance.now();
  let ticks = 0;
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(2, (now - last) / 1000);
    last = now;
    if (music.playing() && !document.hidden) {
      drain(dt);
      if (++ticks % 5 === 0) store.save();
    }
  }, 1000);
}

// Klein batterij-icoontje met percentage (voor op het scherm).
export function badge(id = store.get().speaker) {
  const plug = isPlug(speaker(id));
  const v = Math.round(level(id));
  const cls = plug ? 'plug' : v <= 0 ? 'empty' : v <= 20 ? 'low' : '';
  return `<span class="batt ${cls}" data-batt="${id}"><i style="width:${plug ? 100 : v}%"></i><b>${plug ? '🔌' : v <= 0 ? 'LEEG' : `${v}%`}</b></span>`;
}

// Houd alle batterij-icoontjes op het scherm bij.
window.addEventListener('battery', (e) => {
  document.querySelectorAll(`[data-batt="${e.detail.id}"]`).forEach((el) => { el.outerHTML = badge(e.detail.id); });
});
