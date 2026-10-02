// Stofzuig-Race: sleep Henry met je vinger naar de stofbal met het goede
// antwoord. In de Cijfer-modus zuig je de cijfers één voor één op.
import { h, tap, go, floatText, pick, fmt } from '../ui.js';
import { sfx } from '../audio.js';
import * as music from '../music.js';
import { henrySVG } from '../art.js';
import { makePicker, record } from '../engine.js';
import { findPool, afterRecord } from '../modules/index.js';
import { activeHenry, addWatts, room as findRoom, ROOMS, roomOpen, digitsOpen } from '../rewards.js';
import * as store from '../store.js';

const RACE_MS = 90_000;
const POWERS = [
  { id: 'battery', emoji: '🔋', name: 'Dubbele watts!', ms: 10_000 },
  { id: 'turbo', emoji: '⚡', name: 'Turbo-Henry!', ms: 8_000 },
  { id: 'magnet', emoji: '🧲', name: 'Magneet!', ms: 7_000 },
];
const PRAISE = ['Slurp!', 'Hap!', 'Opgezogen!', 'Lekker!', 'Yes!', 'Mjam!'];

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

function decoys(q, n) {
  const pool = [...new Set(q.near || [])].filter((x) => x !== q.answer);
  const out = shuffle(pool.slice(0, 3)).concat(shuffle(pool.slice(3)));
  const picked = [...new Set(out)].slice(0, n);
  let tries = 0;
  while (picked.length < n && tries++ < 50) {
    const x = q.answer + (Math.floor(Math.random() * 25) - 12);
    if (x >= 0 && x !== q.answer && !picked.includes(x)) picked.push(x);
  }
  return picked;
}

export function raceScreen({ poolId }) {
  const s = store.get();
  const pool = findPool(poolId);
  const next = makePicker(pool.items);
  const rm = findRoom(s.raceRoom);
  const digits = s.raceDigits && digitsOpen();
  const hn = activeHenry();

  const el = h(`<div class="race room-${rm.id}">
    <header class="bar">
      <button class="icon-btn back" aria-label="Stoppen">✕</button>
      <div class="meter"><div class="timebar"><i></i></div><div class="score">0</div></div>
      <div class="pill watts">⚡ <b>0</b></div>
    </header>
    <div class="race-q"><span class="rq-text"></span> = <span class="rq-ans"></span></div>
    <div class="arena">
      <div class="powers"></div>
      <div class="racer"><div class="racer-flip">${henrySVG(hn.color)}</div><div class="bubble"></div></div>
    </div>
    <div class="overlay countdown hidden"></div>
  </div>`);

  const $ = (x) => el.querySelector(x);
  const arena = $('.arena');
  const racerEl = $('.racer');
  const flipEl = $('.racer-flip');
  const bubble = $('.racer .bubble');
  const qText = $('.rq-text');
  const qAns = $('.rq-ans');
  const powersEl = $('.powers');

  let W = 0;
  let H = 0;
  const henry = { x: 0, y: 0, r: 48, face: 1 };
  const target = { x: 0, y: 0 };
  let balls = [];
  let power = null;           // power-up die rondrolt
  const active = {};          // id -> eindtijd
  let q = null;
  let filled = '';            // cijfer-modus: al opgezogen cijfers
  let wrongs = 0;
  let qStart = 0;
  let streak = 0;
  let correct = 0;
  let earned = 0;
  let level = 2;
  let sneezeUntil = 0;
  let running = false;
  let ended = false;
  let raf = 0;
  let last = 0;
  let endAt = 0;
  let nextPowerAt = 0;
  let lastAt = Date.now();
  let goalReached = false;
  const newSpeakers = [];
  const messages = [];
  const missed = [];
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function measure() {
    const r = arena.getBoundingClientRect();
    W = r.width;
    H = r.height;
    henry.r = Math.max(36, Math.min(56, W / 18));
  }

  function say(text, mood) {
    bubble.textContent = text;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    if (mood) {
      flipEl.innerHTML = henrySVG(hn.color, { mood });
      if (mood !== 'happy') later(() => { flipEl.innerHTML = henrySVG(hn.color); }, 900);
    }
    clearTimeout(say.t);
    say.t = setTimeout(() => { bubble.textContent = ''; }, 1400);
  }

  // ---------- Stofballen ----------
  function ballSize() { return Math.max(72, Math.min(96, W / 10)); }

  function spawnBall(value, isGood) {
    const r = ballSize() / 2;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 40; i++) {
      x = r + Math.random() * (W - 2 * r);
      y = r + Math.random() * (H - 2 * r);
      const farHenry = Math.hypot(x - henry.x, y - henry.y) > henry.r + r + 110;
      const farOthers = balls.every((b) => b.dead || Math.hypot(x - b.x, y - b.y) > b.r + r + 14);
      if (farHenry && farOthers) break;
    }
    const a = Math.random() * Math.PI * 2;
    const sp = rm.speed * (0.6 + Math.random() * 0.6);
    const b = {
      x, y, r, value, good: isGood, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dead: false,
      el: h(`<div class="dust" style="width:${2 * r}px;height:${2 * r}px">
        <i class="eye l"></i><i class="eye r"></i><span>${value}</span></div>`),
    };
    arena.appendChild(b.el);
    balls.push(b);
    return b;
  }

  function clearBalls() {
    balls.forEach((b) => {
      if (b.dead) return;
      b.dead = true;
      b.el.classList.add('poof');
      setTimeout(() => b.el.remove(), 300);
    });
    balls = [];
  }

  function needed() { return digits ? String(q.answer)[filled.length] : String(q.answer); }

  function layoutBalls() {
    clearBalls();
    const want = needed();
    if (digits) {
      const others = shuffle('0123456789'.split('').filter((d) => d !== want)).slice(0, rm.balls - 1);
      spawnBall(want, true);
      others.forEach((d) => spawnBall(d, false));
    } else {
      spawnBall(q.answer, true);
      decoys(q, rm.balls - 1).forEach((v) => spawnBall(v, false));
    }
    if (wrongs >= 2) hintBall();
  }

  function hintBall() { balls.forEach((b) => b.good && b.el.classList.add('hint')); }

  function showAns() {
    if (!digits) { qAns.textContent = '?'; return; }
    const len = String(q.answer).length;
    qAns.innerHTML = String(q.answer).split('').map((_, i) =>
      `<b class="${i < filled.length ? 'got' : i === filled.length ? 'now' : ''}">${i < filled.length ? filled[i] : '_'}</b>`).join('');
    qAns.dataset.len = len;
  }

  function newQuestion() {
    q = next();
    filled = '';
    wrongs = 0;
    qStart = performance.now();
    qText.textContent = q.text;
    showAns();
    $('.race-q').classList.remove('enter');
    void el.offsetWidth;
    $('.race-q').classList.add('enter');
    layoutBalls();
  }

  // ---------- Power-ups ----------
  function spawnPower() {
    const p = pick(POWERS);
    const r = 30;
    power = {
      ...p, r, x: r + Math.random() * (W - 2 * r), y: r + Math.random() * (H - 2 * r),
      vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, until: performance.now() + 7000,
      el: h(`<div class="power-item">${p.emoji}</div>`),
    };
    arena.appendChild(power.el);
  }

  function takePower() {
    sfx.power();
    active[power.id] = performance.now() + power.ms;
    say(power.name, 'wow');
    floatText(arena, power.emoji, 'power-float');
    power.el.remove();
    power = null;
  }

  const on = (id) => (active[id] || 0) > performance.now();

  function renderPowers() {
    const html = POWERS.filter((p) => on(p.id)).map((p) => `<span>${p.emoji}</span>`).join('');
    if (powersEl.innerHTML !== html) powersEl.innerHTML = html;
  }

  // ---------- Opzuigen ----------
  function addTime() {
    const t = Date.now();
    if (store.addPlayTime(Math.min(t - lastAt, 30_000) / 1000)) goalReached = true;
    lastAt = t;
  }

  function gain(n) {
    if (on('battery')) n *= 2;
    earned += n;
    $('.watts b').textContent = fmt(earned);
    newSpeakers.push(...addWatts(n));
    floatText(arena, `+${n} ⚡`, 'watt');
  }

  function suck(b) {
    b.dead = true;
    b.el.classList.add('sucked');
    b.el.style.transform = `translate(${henry.x - b.r}px, ${henry.y - b.r}px) scale(0.1)`;
    setTimeout(() => b.el.remove(), 260);
    balls = balls.filter((x) => x !== b);

    if (!b.good) {
      wrongs++;
      streak = 0;
      level = Math.max(2, level - 1);
      music.setLevel(level);
      sneezeUntil = performance.now() + 1100;
      sfx.sneeze();
      say('Hatsjoe! 🤧', 'sad');
      const puff = h('<div class="puff"></div>');
      puff.style.transform = `translate(${henry.x - 60}px, ${henry.y - 60}px)`;
      arena.appendChild(puff);
      setTimeout(() => puff.remove(), 900);
      if (wrongs === 2) hintBall();
      if (balls.filter((x) => !x.dead).length <= 1) later(layoutBalls, 400);
      return;
    }

    if (digits && filled.length + 1 < String(q.answer).length) {
      filled += b.value;
      sfx.slurp(streak);
      showAns();
      later(layoutBalls, 200);
      return;
    }

    // Hele antwoord goed
    if (digits) filled += b.value;
    const ms = performance.now() - qStart;
    const ok = wrongs === 0;
    addTime();
    record(q.key, ok, ms, q.fastMs * (digits ? 3 : 2.2) + 1500, { jump: q.jump });
    const msg = afterRecord(q.key);
    if (msg) messages.push(msg);
    if (!ok) missed.push(`${q.text} = ${q.answer}`);
    correct++;
    streak = ok ? streak + 1 : 0;
    $('.score').textContent = correct;
    const fast = ms <= q.fastMs * 2 + 1500;
    gain(10 + (fast ? 5 : 0) + (streak >= 5 ? 5 : 0) + (digits ? 5 : 0));
    sfx.slurp(streak);
    const lv = streak >= 10 ? 5 : streak >= 6 ? 4 : streak >= 3 ? 3 : 2;
    if (lv > level) { level = lv; music.setLevel(level); }
    say(streak === 10 ? 'DROP! 🔊🔥' : streak === 5 ? '5 op rij! 🔥' : pick(PRAISE), streak >= 5 ? 'wow' : 'happy');
    showAns();
    store.save();
    later(newQuestion, 250);
  }

  // ---------- Spel-lus ----------
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    const now = performance.now();

    const speed = (W / 2.6) * (on('turbo') ? 1.7 : 1) * (now < sneezeUntil ? 0.3 : 1);
    const dx = target.x - henry.x;
    const dy = target.y - henry.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1) {
      const stepLen = Math.min(dist, speed * dt);
      henry.x += (dx / dist) * stepLen;
      henry.y += (dy / dist) * stepLen;
      if (Math.abs(dx) > 4) henry.face = dx < 0 ? -1 : 1;
    }
    const size = henry.r * 2.4;
    racerEl.style.width = `${size}px`;
    racerEl.style.transform = `translate(${henry.x - size / 2}px, ${henry.y - size * 0.55}px)`;
    flipEl.style.transform = `scaleX(${henry.face}) rotate(${Math.max(-8, Math.min(8, dx / 20)) * henry.face}deg)`;

    for (const b of balls) {
      if (b.dead) continue;
      const hx = henry.x - b.x;
      const hy = henry.y - b.y;
      const d = Math.hypot(hx, hy);
      if (b.good && on('magnet')) {
        b.x += (hx / d) * 150 * dt;
        b.y += (hy / d) * 150 * dt;
      } else {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      // zuigkracht van dichtbij
      if (d < henry.r + b.r + 40) {
        b.x += (hx / d) * 90 * dt;
        b.y += (hy / d) * 90 * dt;
      }
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
      if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
      b.el.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px)`;
      if (d < henry.r + b.r * 0.55) { suck(b); break; }
    }

    if (power) {
      power.x = Math.max(power.r, Math.min(W - power.r, power.x + power.vx * dt));
      power.y = Math.max(power.r, Math.min(H - power.r, power.y + power.vy * dt));
      if (power.x <= power.r || power.x >= W - power.r) power.vx *= -1;
      if (power.y <= power.r || power.y >= H - power.r) power.vy *= -1;
      power.el.style.transform = `translate(${power.x - power.r}px, ${power.y - power.r}px)`;
      if (Math.hypot(henry.x - power.x, henry.y - power.y) < henry.r + power.r) takePower();
      else if (now > power.until) { power.el.remove(); power = null; }
    } else if (now > nextPowerAt) {
      spawnPower();
      nextPowerAt = now + 12_000 + Math.random() * 8_000;
    }
    renderPowers();

    const left = endAt - now;
    $('.timebar i').style.transform = `scaleX(${Math.max(0, left / RACE_MS)})`;
    $('.timebar i').classList.toggle('low', left < 10_000);
    const sec = Math.ceil(left / 1000);
    if (sec <= 10 && sec !== frame.sec && sec > 0) { sfx.tick(); if (sec === 10) music.setTempo(1.08); }
    frame.sec = sec;
    if (left <= 0) { finish(false); return; }
    raf = requestAnimationFrame(frame);
  }

  // ---------- Vinger ----------
  function point(e) {
    const r = arena.getBoundingClientRect();
    target.x = Math.max(0, Math.min(W, e.clientX - r.left));
    target.y = Math.max(0, Math.min(H, e.clientY - r.top));
  }
  arena.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { arena.setPointerCapture(e.pointerId); } catch {}
    point(e);
  });
  arena.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') point(e); });
  const onResize = () => measure();
  window.addEventListener('resize', onResize);

  tap($('.back'), () => finish(true));

  function finish(quit) {
    if (ended) return;
    ended = true;
    running = false;
    cancelAnimationFrame(raf);
    addTime();
    music.stop(0.4);
    const st = store.get();
    if (quit && correct === 0) { store.save(); go('home'); return; }
    const lines = [`${correct} sommen opgezogen`, `+${fmt(earned)} ⚡ verdiend`];
    let title = quit ? 'Goed gedaan!' : `${correct} opgezogen! 🧹`;
    if (!quit) {
      const recKey = `${poolId}${digits ? ':cijfers' : ''}`;
      const prev = st.race.best[recKey] || 0;
      if (correct > prev) {
        st.race.best[recKey] = correct;
        lines.unshift(prev ? `🏆 Nieuw record! (was ${prev})` : '🏆 Je eerste record!');
      } else lines.push(`Record: ${prev}`);
      const digitsBefore = digitsOpen();
      const roomsBefore = ROOMS.filter(roomOpen).length;
      st.race.played++;
      st.race.bestAny = Math.max(st.race.bestAny, correct);
      ROOMS.filter(roomOpen).slice(roomsBefore).forEach((r) => messages.push(`Nieuwe kamer: ${r.emoji} ${r.name}`));
      if (!digitsBefore && digitsOpen()) messages.push('Cijfer-modus vrijgespeeld! 🔢 Zuig de cijfers in de goede volgorde op.');
    }
    if (missed.length) lines.push(`Nog even oefenen: ${missed.slice(0, 3).join(', ')}`);
    store.save();
    go('party', {
      title, lines, big: goalReached, newSpeakers, messages,
      again: quit ? null : { screen: 'race', args: { poolId } },
    });
  }

  function start() {
    measure();
    henry.x = W / 2;
    henry.y = H / 2;
    target.x = henry.x;
    target.y = henry.y;
    const ov = $('.countdown');
    ov.classList.remove('hidden');
    ov.innerHTML = `<div class="race-intro">${digits ? '🔢 Cijfer-modus' : `${rm.emoji} ${rm.name}`}<small>Sleep Henry naar het goede antwoord!</small></div>`;
    let n = 3;
    const tick = () => {
      if (n > 0) { ov.textContent = n; sfx.tick(); n--; later(tick, 700); return; }
      ov.textContent = 'GO!';
      sfx.whistle();
      later(() => {
        ov.classList.add('hidden');
        music.play(store.get().song, { level });
        running = true;
        endAt = performance.now() + RACE_MS;
        nextPowerAt = performance.now() + 8_000;
        lastAt = Date.now();
        newQuestion();
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }, 450);
    };
    later(tick, 1500);
  }
  requestAnimationFrame(start);

  return {
    el,
    leave() {
      ended = true;
      running = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
      music.stop(0.3);
    },
  };
}
