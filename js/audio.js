// Alle geluid wordt live gemaakt met Web Audio: geen geluidsbestanden nodig.
// Hier staan de geluidseffecten; de muziek zit in music.js.
let ctx = null;
let master = null;
let noiseBuf = null;
let enabled = true;

export function unlock() {
  try {
    // iOS: speel ook als de stil-schakelaar aan staat (Safari 16.4+).
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch {}
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.8 : 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  resume();
}

export function resume() {
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}

export const getAudio = () => ({ ctx, master, noiseBuf });

export function setEnabled(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.02);
}

const now = () => (ctx ? ctx.currentTime : 0);
export const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tone({ freq, type = 'sine', at = 0, dur = 0.15, vol = 0.3, slideTo, attack = 0.005 }) {
  if (!ctx) return;
  const t = now() + Math.max(0, at);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({ at = 0, dur = 0.1, vol = 0.3, type = 'highpass', freq = 6000, q = 1, sweepTo }) {
  if (!ctx) return;
  const t = now() + Math.max(0, at);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

export const sfx = {
  tap() { tone({ freq: 900, type: 'triangle', dur: 0.05, vol: 0.12 }); },
  key() { tone({ freq: 620 + Math.random() * 80, type: 'triangle', dur: 0.06, vol: 0.15 }); },
  correct(streak = 0) {
    const base = 72 + Math.min(streak, 7);
    tone({ freq: midi(base), type: 'triangle', dur: 0.12, vol: 0.25 });
    tone({ freq: midi(base + 7), type: 'triangle', at: 0.08, dur: 0.22, vol: 0.25 });
    tone({ freq: 70, slideTo: 40, dur: 0.25, vol: 0.5, at: 0.02 }); // bas-boem uit de speaker
  },
  wrong() {
    tone({ freq: 300, slideTo: 150, type: 'sine', dur: 0.35, vol: 0.25 });
    noise({ dur: 0.35, vol: 0.08, type: 'bandpass', freq: 800, sweepTo: 200 }); // stofzuig-pruttel
  },
  coin() {
    tone({ freq: midi(84), type: 'square', dur: 0.06, vol: 0.08 });
    tone({ freq: midi(91), type: 'square', at: 0.06, dur: 0.15, vol: 0.08 });
  },
  fanfare() {
    [60, 64, 67, 72, 67, 72, 76].forEach((m, i) =>
      tone({ freq: midi(m), type: 'square', at: i * 0.11, dur: i === 6 ? 0.6 : 0.14, vol: 0.12 }));
    noise({ at: 0.66, dur: 0.6, vol: 0.12, type: 'highpass', freq: 5000 });
  },
  tick() { tone({ freq: 1500, type: 'square', dur: 0.03, vol: 0.05 }); },
  whistle() { tone({ freq: midi(84), type: 'sine', dur: 0.5, vol: 0.2, slideTo: midi(96) }); },
  // Henry "praat" met piepjes en een stofzuig-zoef.
  henry(mood = 'happy') {
    noise({ dur: 0.35, vol: 0.12, type: 'bandpass', freq: 400, sweepTo: 2500, q: 2 });
    const n = 3 + Math.floor(Math.random() * 3);
    let f = mood === 'sad' ? 700 : 600;
    for (let i = 0; i < n; i++) {
      const next = mood === 'sad' ? f * (0.8 + Math.random() * 0.1) : f * (1 + Math.random() * 0.35);
      tone({ freq: f, slideTo: next, type: 'triangle', at: 0.15 + i * 0.09, dur: 0.08, vol: 0.14 });
      f = mood === 'sad' ? next : Math.min(next, 1600) * (Math.random() < 0.4 ? 0.7 : 1);
    }
  },
  vacuum() { noise({ dur: 0.5, vol: 0.18, type: 'bandpass', freq: 300, sweepTo: 3000, q: 1.5 }); },
  // Opzuigen: zoef omhoog + "plop".
  slurp(streak = 0) {
    noise({ dur: 0.28, vol: 0.25, type: 'bandpass', freq: 600, sweepTo: 4000, q: 3 });
    tone({ freq: midi(67 + Math.min(streak, 10)), slideTo: midi(79 + Math.min(streak, 10)), type: 'sine', at: 0.05, dur: 0.18, vol: 0.22 });
    tone({ freq: midi(84 + Math.min(streak, 10)), type: 'triangle', at: 0.2, dur: 0.12, vol: 0.15 });
  },
  sneeze() {
    // "Hat..." (inademen) en dan "...sjoe!"
    noise({ dur: 0.35, vol: 0.08, type: 'bandpass', freq: 1200, sweepTo: 2200, q: 2 });
    tone({ freq: 500, slideTo: 800, type: 'triangle', dur: 0.3, vol: 0.08 });
    noise({ at: 0.4, dur: 0.35, vol: 0.4, type: 'bandpass', freq: 3000, sweepTo: 600, q: 0.8 });
    tone({ freq: 260, slideTo: 120, type: 'sawtooth', at: 0.4, dur: 0.2, vol: 0.06 });
  },
  power() {
    [72, 76, 79, 84, 88].forEach((m, i) => tone({ freq: midi(m), type: 'square', at: i * 0.05, dur: 0.1, vol: 0.07 }));
    noise({ dur: 0.4, vol: 0.1, freq: 3000, sweepTo: 9000 });
  },
  pop() { tone({ freq: 400, slideTo: 900, type: 'sine', dur: 0.08, vol: 0.12 }); },
  lowBattery() {
    tone({ freq: 880, type: 'square', dur: 0.09, vol: 0.08 });
    tone({ freq: 880, type: 'square', at: 0.16, dur: 0.09, vol: 0.08 });
  },
  batteryEmpty() {
    [72, 67, 63, 60].forEach((m, i) => tone({ freq: midi(m), type: 'triangle', at: 0.3 + i * 0.16, dur: 0.18, vol: 0.14 }));
  },
  // Oplaad-zoem die hoger wordt naarmate de batterij voller is.
  charge(pct = 50) {
    const f = 300 + pct * 6;
    tone({ freq: f, slideTo: f * 1.5, type: 'sawtooth', dur: 0.25, vol: 0.05 });
    tone({ freq: f * 2, slideTo: f * 3, type: 'sine', at: 0.05, dur: 0.2, vol: 0.08 });
  },
  full() {
    [72, 76, 79, 84].forEach((m, i) => tone({ freq: midi(m), type: 'triangle', at: i * 0.08, dur: 0.25, vol: 0.15 }));
  },
  // Speaker landt op het podium: BOEM.
  boom() {
    tone({ freq: 120, slideTo: 35, dur: 0.6, vol: 0.9, attack: 0.002 });
    noise({ dur: 0.9, vol: 0.2, type: 'lowpass', freq: 900, sweepTo: 120 });
    noise({ at: 0.02, dur: 1.2, vol: 0.12, freq: 5000 });
  },
  powerOn() {
    tone({ freq: 60, slideTo: 240, type: 'sawtooth', dur: 0.5, vol: 0.08 });
    tone({ freq: midi(84), type: 'sine', at: 0.45, dur: 0.15, vol: 0.12 });
  },
  // Boze kat: "MIAUW!" (toon door een bewegend filter) + blazen.
  meow() {
    if (!ctx) return;
    const t = now();
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(820, t + 0.18);
    o.frequency.linearRampToValueAtTime(430, t + 0.55);
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(1900, t + 0.2);
    f.frequency.linearRampToValueAtTime(900, t + 0.55);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(f);
    f.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.65);
    noise({ at: 0.55, dur: 0.45, vol: 0.18, type: 'highpass', freq: 3500 });
  },
};
