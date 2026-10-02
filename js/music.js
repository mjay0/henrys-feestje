// Muziekmotor: speelt de nummers uit songs.js live af met Web Audio.
// Niveau (1-5) bepaalt hoeveel lagen er meespelen; in 'party' bouwt het
// nummer zelf op naar een drop.
import { getAudio, midi } from './audio.js';
import { song as findSong } from './songs.js';

let ctx = null;
let out = null;      // muziek-volume
let duck = null;     // bas/pad, gaat "pompen" op de kick
let dry = null;
let delayIn = null;
let verbIn = null;
let pulse = null;
let musicOn = true;
const VOLUME = 0.6;
let toneHP = null;
let toneShelf = null;
let powerLP = null;
let toneGain = null;
let tier = 1;
let maxLevel = 5;
let gate = null;     // mag er muziek spelen? (batterij)

// Speaker-klank per grootte (tier 1 = klein, 5 = Ultimate).
const TONE = {
  1: { hp: 140, shelf: 0, gain: 0.85, max: 4 },
  2: { hp: 90, shelf: 1.5, gain: 0.92, max: 5 },
  3: { hp: 55, shelf: 3, gain: 1, max: 5 },
  4: { hp: 35, shelf: 4.5, gain: 1.05, max: 5 },
  5: { hp: 25, shelf: 6, gain: 1.1, max: 5 },
};

function applyTone() {
  const t = TONE[tier] || TONE[1];
  maxLevel = t.max;
  if (!toneHP) return;
  toneHP.frequency.setTargetAtTime(t.hp, ctx.currentTime, 0.05);
  toneShelf.gain.setTargetAtTime(t.shelf, ctx.currentTime, 0.05);
  toneGain.gain.setTargetAtTime(t.gain, ctx.currentTime, 0.05);
}

export function setTone(n) { tier = n; applyTone(); }

// gate() geeft false als de batterij leeg is: dan geen muziek.
export function setGate(fn) { gate = fn; }

function setup() {
  const a = getAudio();
  if (!a.ctx) return false;
  if (ctx) return true;
  ctx = a.ctx;
  out = ctx.createGain();
  out.gain.value = 0;
  // Klank van de speaker: kleine speakers minder bas, grote meer.
  toneHP = ctx.createBiquadFilter();
  toneHP.type = 'highpass';
  toneShelf = ctx.createBiquadFilter();
  toneShelf.type = 'lowshelf';
  toneShelf.frequency.value = 120;
  powerLP = ctx.createBiquadFilter();
  powerLP.type = 'lowpass';
  powerLP.frequency.value = 20000;
  toneGain = ctx.createGain();
  out.connect(toneHP);
  toneHP.connect(toneShelf);
  toneShelf.connect(powerLP);
  powerLP.connect(toneGain);
  toneGain.connect(a.master);
  applyTone();
  duck = ctx.createGain();
  duck.connect(out);
  dry = ctx.createGain();
  dry.connect(out);

  const delay = ctx.createDelay(1);
  const fb = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  fb.gain.value = 0.3;
  lp.type = 'lowpass';
  lp.frequency.value = 2800;
  delayIn = ctx.createGain();
  delayIn.connect(delay);
  delay.connect(lp);
  lp.connect(fb);
  fb.connect(delay);
  lp.connect(out);
  delayIn.delay = delay;

  const conv = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 2.2);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  conv.buffer = ir;
  verbIn = ctx.createGain();
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.45;
  verbIn.connect(conv);
  conv.connect(verbOut);
  verbOut.connect(out);

  // Pulsgolf (25%) voor het 8-bit geluid.
  const n = 48;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * 0.25);
  pulse = ctx.createPeriodicWave(re, im);
  return true;
}

export function setMusicEnabled(on) {
  musicOn = on;
  if (out && cur) out.gain.setTargetAtTime(on ? VOLUME : 0, ctx.currentTime, 0.1);
}

// ---------- Instrumenten ----------
function osc(type, freq, t) {
  const o = ctx.createOscillator();
  if (type === 'pulse') o.setPeriodicWave(pulse);
  else o.type = type;
  o.frequency.setValueAtTime(freq, t);
  return o;
}

function env(g, t, { a = 0.005, peak = 0.3, len = 0.2, r = 0.08 }) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + Math.max(a, len));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, len) + r);
  return t + Math.max(a, len) + r + 0.02;
}

function sends(node, { d = 0, v = 0 } = {}) {
  if (d) { const g = ctx.createGain(); g.gain.value = d; node.connect(g); g.connect(delayIn); }
  if (v) { const g = ctx.createGain(); g.gain.value = v; node.connect(g); g.connect(verbIn); }
}

function noiseHit(t, { type = 'highpass', freq = 8000, q = 1, dur = 0.05, vol = 0.2, sweepTo, dest = dry, v = 0 }) {
  const { noiseBuf } = getAudio();
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(dest);
  sends(g, { v });
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.05);
}

const DRUM = {
  kick(t, kit, acc) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const deep = kit === '808';
    o.type = kit === 'chip' ? 'square' : 'sine';
    o.frequency.setValueAtTime(kit === 'chip' ? 120 : 160, t);
    o.frequency.exponentialRampToValueAtTime(deep ? 42 : 48, t + (deep ? 0.15 : 0.09));
    const vol = (kit === 'chip' ? 0.55 : 0.9) * (acc ? 1.1 : 1);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (deep ? 0.6 : 0.32));
    o.connect(g);
    g.connect(dry);
    o.start(t);
    o.stop(t + 0.7);
    if (kit !== 'chip') noiseHit(t, { freq: 3000, dur: 0.012, vol: 0.15 });
  },
  snare(t, kit, acc) {
    if (kit === 'chip') { noiseHit(t, { type: 'bandpass', freq: 2500, dur: 0.12, vol: 0.3 }); return; }
    noiseHit(t, { type: 'bandpass', freq: 1800, q: 0.7, dur: 0.2, vol: acc ? 0.55 : 0.4, v: 0.25 });
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g);
    g.connect(dry);
    o.start(t);
    o.stop(t + 0.15);
  },
  clap(t) {
    [0, 0.011, 0.023].forEach((d) => noiseHit(t + d, { type: 'bandpass', freq: 1200, q: 1.2, dur: 0.03, vol: 0.35 }));
    noiseHit(t + 0.03, { type: 'bandpass', freq: 1200, q: 1.2, dur: 0.18, vol: 0.3, v: 0.4 });
  },
  hat(t, kit, acc, open) {
    noiseHit(t, { freq: kit === 'chip' ? 6000 : 8500, dur: open ? 0.28 : 0.035, vol: (open ? 0.12 : 0.13) * (acc ? 1.3 : 1) });
  },
  perc(t, kit) {
    if (kit === '808') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 1700;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      o.connect(g);
      g.connect(dry);
      o.start(t);
      o.stop(t + 0.06);
    } else {
      noiseHit(t, { type: 'bandpass', freq: 7000, q: 1.5, dur: 0.045, vol: 0.07 });
    }
  },
};

function bass(t, note, len, type) {
  const f = midi(note);
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  let end;
  if (type === 'sub808') {
    const o = osc('sine', f * 2, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const sh = ctx.createWaveShaper();
    const c = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 2.5); }
    sh.curve = c;
    end = env(g, t, { a: 0.005, peak: 0.26, len: len * 0.9, r: 0.15 });
    o.connect(sh);
    sh.connect(g);
    o.start(t);
    o.stop(end);
    g.connect(duck);
    return;
  }
  if (type === 'sub' || type === 'tri') {
    const o = osc(type === 'sub' ? 'sine' : 'triangle', f, t);
    end = env(g, t, { a: 0.005, peak: type === 'sub' ? 0.32 : 0.35, len: len * 0.8, r: 0.06 });
    o.connect(g);
    o.start(t);
    o.stop(end);
    g.connect(duck);
    return;
  }
  const o = osc('sawtooth', f, t);
  const sub = osc('sine', f / 2, t);
  const subG = ctx.createGain();
  subG.gain.value = 0.6;
  lp.Q.value = type === 'acid' ? 9 : 2;
  lp.frequency.setValueAtTime(type === 'acid' ? 2400 + Math.random() * 1200 : 1600, t);
  lp.frequency.exponentialRampToValueAtTime(type === 'acid' ? 260 : 380, t + len);
  end = env(g, t, { a: 0.004, peak: type === 'acid' ? 0.2 : 0.22, len: len * 0.75, r: 0.05 });
  o.connect(lp);
  lp.connect(g);
  sub.connect(subG);
  subG.connect(g);
  o.start(t);
  sub.start(t);
  o.stop(end);
  sub.stop(end);
  g.connect(duck);
}

function pad(t, notes, len) {
  notes.forEach((n) => [-7, 7].forEach((det) => {
    const o = osc('sawtooth', midi(n), t);
    o.detune.value = det;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1300;
    const g = ctx.createGain();
    const end = env(g, t, { a: 0.3, peak: 0.022, len: len - 0.3, r: 0.5 });
    o.connect(lp);
    lp.connect(g);
    g.connect(duck);
    sends(g, { v: 0.8 });
    o.start(t);
    o.stop(end);
  }));
}

function stab(t, notes) {
  notes.forEach((n) => {
    const o = osc('square', midi(n + 12), t);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    const g = ctx.createGain();
    const end = env(g, t, { a: 0.003, peak: 0.035, len: 0.08, r: 0.08 });
    o.connect(lp);
    lp.connect(g);
    g.connect(dry);
    sends(g, { d: 0.3, v: 0.3 });
    o.start(t);
    o.stop(end);
  });
}

function pluck(t, note, type, vol = 1) {
  const f = midi(note);
  const g = ctx.createGain();
  let end;
  if (type === 'marimba') {
    const o = osc('sine', f, t);
    const o2 = osc('sine', f * 4, t);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.05 * vol, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    end = env(g, t, { a: 0.002, peak: 0.16 * vol, len: 0.02, r: 0.3 });
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    o.start(t); o2.start(t); o.stop(end); o2.stop(end);
  } else {
    const o = osc(type === 'pulse' ? 'pulse' : 'sawtooth', f, t);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = type === 'acid' ? 12 : 1;
    lp.frequency.setValueAtTime(type === 'acid' ? 3500 : 4000, t);
    lp.frequency.exponentialRampToValueAtTime(type === 'acid' ? 300 : 500, t + 0.18);
    end = env(g, t, { a: 0.002, peak: (type === 'pulse' ? 0.05 : 0.08) * vol, len: 0.04, r: 0.15 });
    o.connect(lp);
    lp.connect(g);
    o.start(t);
    o.stop(end);
  }
  g.connect(dry);
  sends(g, { d: 0.35, v: 0.2 });
}

function lead(t, note, len, type, vol = 1) {
  const f = midi(note);
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = type === 'whistle' ? 6000 : 3800;
  const voices = type === 'saw' ? [-10, 0, 10] : [0];
  const peak = { saw: 0.075, square: 0.095, pulse: 0.1, whistle: 0.19 }[type] * vol;
  const end = env(g, t, { a: type === 'whistle' ? 0.03 : 0.01, peak, len: len * 0.92, r: 0.12 });
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = 5.5;
  lfoG.gain.setValueAtTime(0, t);
  lfoG.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.3, len));
  lfo.connect(lfoG);
  voices.forEach((det) => {
    const o = osc(type === 'saw' ? 'sawtooth' : type === 'whistle' ? 'sine' : type, f, t);
    o.detune.value = det;
    lfoG.connect(o.frequency);
    o.connect(lp);
    o.start(t);
    o.stop(end);
  });
  lfo.start(t);
  lfo.stop(end);
  lp.connect(g);
  g.connect(dry);
  sends(g, { d: 0.3, v: 0.3 });
}

const riser = (t, dur) => noiseHit(t, { type: 'bandpass', freq: 500, q: 2, dur, vol: 0.18, sweepTo: 9000 });
const crash = (t) => noiseHit(t, { freq: 4500, dur: 1.6, vol: 0.16, v: 0.6 });

// ---------- Noten lezen ----------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteNum(tok) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(tok);
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

// Zet een regel om naar [{ i, v, len }] (len in zestienden).
function parseLine(str) {
  const toks = str.trim().split(/\s+/);
  const events = [];
  toks.forEach((tk, i) => {
    if (tk === '-') { if (events.length) events[events.length - 1].len++; return; }
    if (tk === '.') return;
    events.push({ i, v: tk, len: 1 });
  });
  return events;
}

const parsed = new Map();
function prepare(s) {
  if (parsed.has(s.id)) return parsed.get(s.id);
  const p = {
    bass: parseLine(s.bass.pattern),
    stab: s.stab ? parseLine(s.stab) : [],
    arp: s.arp ? parseLine(s.arp.pattern) : [],
    lead: s.lead.bars.map((b) => parseLine(b).map((e) => ({ ...e, n: noteNum(e.v) }))),
  };
  parsed.set(s.id, p);
  return p;
}

// ---------- Afspelen ----------
// party: 1 maat intro, 1 maat opbouw, 8 maten drop, 2 rustig, 2 opbouw, ...
const PARTY = [
  { l: 2 }, { l: 3, build: true },
  { l: 5 }, { l: 5 }, { l: 5 }, { l: 5 }, { l: 5 }, { l: 5 }, { l: 5 }, { l: 5 },
  { l: 3 }, { l: 3 }, { l: 3 }, { l: 3, build: true },
];
const partyBar = (b) => PARTY[b < PARTY.length ? b : 2 + ((b - 2) % (PARTY.length - 2))];

let cur = null;
let timer = null;
let stopTimer = null;

// drop: in 'party' meteen bij de drop beginnen (na het opladen).
// Geeft false terug als er geen muziek mag (batterij leeg).
export function play(id, { mode = 'live', level = 2, onKick = null, drop = false } = {}) {
  if (!setup()) return false;
  stopNow();
  if (gate && !gate()) return false;
  const s = findSong(id);
  const step = mode === 'party' && drop ? 32 : 0;
  cur = { s, p: prepare(s), mode, level, prevLevel: level, tempo: 1, step, next: ctx.currentTime + 0.08, onKick };
  powerLP.frequency.cancelScheduledValues(ctx.currentTime);
  powerLP.frequency.setValueAtTime(20000, ctx.currentTime);
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
  out.gain.linearRampToValueAtTime(musicOn ? VOLUME : 0, ctx.currentTime + 0.4);
  timer = setInterval(tick, 25);
  return true;
}

// Batterij leeg: muziek "valt uit" (trager, doffer, stil).
export function powerDown() {
  if (!cur || !ctx) return;
  const c = cur;
  const t = ctx.currentTime;
  powerLP.frequency.cancelScheduledValues(t);
  powerLP.frequency.setValueAtTime(12000, t);
  powerLP.frequency.exponentialRampToValueAtTime(120, t + 1.8);
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value, t);
  out.gain.linearRampToValueAtTime(0, t + 2);
  c.onKick = null;
  const slow = setInterval(() => { if (cur === c) c.tempo = Math.max(0.35, c.tempo * 0.88); }, 100);
  stopTimer = setTimeout(() => { clearInterval(slow); if (cur === c) stopNow(); }, 2100);
}

export function setLevel(n) { if (cur) cur.level = Math.max(1, Math.min(5, n)); }
export function setTempo(x) { if (cur) cur.tempo = x; }
export const playing = () => (cur ? cur.s.id : null);

function stopNow() {
  if (timer) clearInterval(timer);
  if (stopTimer) clearTimeout(stopTimer);
  timer = null;
  stopTimer = null;
  cur = null;
}

export function stop(fade = 0.6) {
  if (!cur || !ctx) { stopNow(); return; }
  out.gain.cancelScheduledValues(ctx.currentTime);
  out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
  out.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
  const c = cur;
  stopTimer = setTimeout(() => { if (cur === c) stopNow(); }, fade * 1000 + 50);
  cur.onKick = null;
}

function tick() {
  if (!cur) return;
  while (cur && cur.next < ctx.currentTime + 0.25) {
    const stepDur = 60 / (cur.s.bpm * cur.tempo) / 4;
    const swing = cur.step % 2 === 1 ? (cur.s.swing || 0) * stepDur : 0;
    if (cur.next + swing > ctx.currentTime - 0.05) scheduleStep(cur.next + swing, stepDur);
    cur.next += stepDur;
    cur.step++;
  }
}

function scheduleStep(t, sd) {
  const { s, p } = cur;
  const i = cur.step % 16;
  const bar = Math.floor(cur.step / 16);
  const bi = bar % s.chords.length;
  const chord = s.chords[bi];
  const pb = cur.mode === 'party' ? partyBar(bar) : null;
  const L = Math.min(maxLevel, pb ? pb.l : cur.level);
  const build = pb ? pb.build : false;
  const kit = s.kit;
  const hit = (pat) => pat && pat[i] !== '.' && pat[i] !== undefined;
  const acc = (pat) => pat[i] === 'X';
  const d = s.drums;

  // Crash bij het begin van een drop.
  if (i === 0) {
    const prev = cur.mode === 'party' ? (bar > 0 ? partyBar(bar - 1).l : 0) : cur.prevLevel;
    if (L >= 5 && (prev < 5 || bar % 8 === 0)) crash(t);
    cur.prevLevel = L;
    if (build) riser(t, sd * 16);
  }

  // Drums
  let kicked = false;
  if (build) {
    if (i % 4 === 0) { DRUM.kick(t, kit); kicked = true; }
    const every = i < 8 ? 4 : i < 12 ? 2 : 1;
    if (i % every === 0) DRUM.snare(t, kit, i >= 12);
  } else {
    if (hit(d.kick)) { DRUM.kick(t, kit, acc(d.kick)); kicked = true; }
    if (hit(d.hat)) DRUM.hat(t, kit, acc(d.hat), false);
    if (L >= 2 && hit(d.snare)) DRUM.snare(t, kit, acc(d.snare));
    if (L >= 2 && hit(d.clap)) DRUM.clap(t);
    if (L >= 3 && hit(d.open)) DRUM.hat(t, kit, false, true);
    if (L >= 3 && hit(d.perc)) DRUM.perc(t, kit);
    if (L >= 5 && hit(d.hat16)) DRUM.hat(t, kit, false, false);
  }
  if (kicked) {
    if (s.pump) {
      duck.gain.cancelScheduledValues(t);
      duck.gain.setValueAtTime(0.35, t);
      duck.gain.linearRampToValueAtTime(1, t + 0.2);
    }
    if (cur.onKick) { const cb = cur.onKick; setTimeout(cb, Math.max(0, (t - ctx.currentTime) * 1000)); }
  }

  // Pad
  if (s.pad && i === 0) pad(t, chord.slice(1), sd * 16);

  // Bas
  if (L >= 2 && !build) {
    const e = p.bass.find((x) => x.i === i);
    if (e) {
      const root = chord[0];
      const n = { R: root, O: root + 12, 5: root + 7, 3: root + (chord[2] - chord[1] === 3 ? 3 : 4) }[e.v] ?? root;
      bass(t, n, e.len * sd, s.bass.type);
    }
  }

  // Akkoord-stoten en arpeggio
  if (L >= 3 && p.stab.some((x) => x.i === i)) stab(t, chord.slice(1));
  if (L >= 3) {
    const e = p.arp.find((x) => x.i === i);
    if (e) {
      const k = Number(e.v);
      const notes = chord.slice(1);
      pluck(t, notes[k % notes.length] + 12 * (1 + Math.floor(k / notes.length)), s.arp.type, L >= 4 ? 0.7 : 1);
    }
  }

  // Melodie
  if (L >= 4) {
    const e = p.lead[bi].find((x) => x.i === i);
    if (e && e.n) {
      lead(t, e.n, e.len * sd, s.lead.type);
      if (L >= 5) lead(t, e.n - 12, e.len * sd, s.lead.type, 0.5);
    }
  }

  // Stofzuig-scratch aan het eind van de rondgang
  if (s.scratch && L >= 3 && bi === s.chords.length - 1 && i === 12) {
    noiseHit(t, { type: 'bandpass', freq: 300, q: 2, dur: sd * 4, vol: 0.2, sweepTo: 3500 });
  }
}

// Om op de maat mee te bewegen.
export function beatSeconds() { return cur ? 60 / (cur.s.bpm * cur.tempo) : 0.5; }
