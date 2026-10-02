// Alle geluid wordt live gemaakt met Web Audio: geen geluidsbestanden nodig.
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
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function setEnabled(on) {
  enabled = on;
  if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.02);
}

const now = () => (ctx ? ctx.currentTime : 0);
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tone({ freq, type = 'sine', at = 0, dur = 0.15, vol = 0.3, slideTo, attack = 0.005, dest }) {
  if (!ctx) return;
  const t = now() + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest || master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise({ at = 0, dur = 0.1, vol = 0.3, type = 'highpass', freq = 6000, q = 1, sweepTo }) {
  if (!ctx) return;
  const t = now() + at;
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
  src.start(t, Math.random() * 0.5);
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
};

// ---------- Beat-machine voor het feest ----------
const BPM = 120;
const STEP = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]]; // Am F C G
const BASS = [45, 41, 48, 43];
let timer = null;
let beatIntensity = 1;
let nextTime = 0;
let step = 0;
let onKick = null;

function kick(at, vol) {
  tone({ freq: 150, slideTo: 42, at, dur: 0.3, vol, attack: 0.002 });
}

function scheduleStep(at) {
  const i = step % 16;
  const bar = Math.floor(step / 16) % 4;
  const lvl = beatIntensity;
  const rel = at - now();
  if (i % 4 === 0) {
    kick(rel, 0.5 + lvl * 0.08);
    if (onKick) setTimeout(onKick, Math.max(0, rel * 1000));
  }
  if (i % 4 === 2) noise({ at: rel, dur: 0.05, vol: 0.12, freq: 7000 });
  if (lvl >= 4 && i % 2 === 1) noise({ at: rel, dur: 0.03, vol: 0.05, freq: 9000 });
  if (lvl >= 2 && (i === 4 || i === 12)) noise({ at: rel, dur: 0.18, vol: 0.25, type: 'bandpass', freq: 1500, q: 0.8 });
  if (lvl >= 2 && [0, 3, 6, 8, 11, 14].includes(i)) {
    tone({ freq: midi(BASS[bar]), type: 'sawtooth', at: rel, dur: 0.18, vol: 0.12 + lvl * 0.02 });
    tone({ freq: midi(BASS[bar] - 12), type: 'sine', at: rel, dur: 0.2, vol: 0.2 });
  }
  if (lvl >= 3 && i % 2 === 0) {
    const c = CHORDS[bar];
    tone({ freq: midi(c[(i / 2) % 3] + 12), type: 'square', at: rel, dur: 0.1, vol: 0.05 });
  }
  if (lvl >= 5 && i === 0 && bar === 0) noise({ at: rel, dur: 1.2, vol: 0.15, freq: 3000, sweepTo: 9000 });
  step++;
}

export function startBeat(intensity = 1, kickCb = null) {
  if (!ctx) return;
  stopBeat();
  beatIntensity = intensity;
  onKick = kickCb;
  step = 0;
  nextTime = now() + 0.1;
  timer = setInterval(() => {
    while (nextTime < now() + 0.12) {
      scheduleStep(nextTime);
      nextTime += STEP;
    }
  }, 25);
}

export function stopBeat() {
  if (timer) clearInterval(timer);
  timer = null;
  onKick = null;
}

export const BEAT_SECONDS = 60 / BPM;
