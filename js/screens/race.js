// Stofzuig-Race: sleep Henry met je vinger naar de stofbal met het goede
// antwoord. In de Cijfer-modus zuig je de cijfers één voor één op.
import { h, tap, go, floatText, pick, fmt } from '../ui.js';
import { sfx } from '../audio.js';
import * as music from '../music.js';
import { henrySVG, furnitureSVG, catSVG } from '../art.js';
import * as battery from '../battery.js';
import { makePicker, record } from '../engine.js';
import { findPool, afterRecord } from '../modules/index.js';
import { activeHenry, activeSpeaker, speakerArt, addWatts, room as findRoom, ROOMS, roomOpen, digitsOpen } from '../rewards.js';
import * as store from '../store.js';

const RACE_MS = 90_000;
const POWERS = [
  { id: 'battery', emoji: '🔋', name: 'Dubbele watts!', ms: 10_000 },
  { id: 'turbo', emoji: '⚡', name: 'Turbo-Henry!', ms: 8_000 },
  { id: 'magnet', emoji: '🧲', name: 'Magneet!', ms: 7_000 },
];
const PRAISE = ['Slurp!', 'Hap!', 'Opgezogen!', 'Lekker!', 'Yes!', 'Mjam!'];

// Meubels per kamer. x/y = midden als deel van de breedte/hoogte van de vloer,
// w/h = grootte als deel van de kortste zijde (zo blijven ze in verhouding).
// Het midden blijft vrij: daar start Henry.
const LAYOUT = {
  woonkamer: [
    { kind: 'sofa', x: 0.2, y: 0.2, w: 0.5, h: 0.28 },
    { kind: 'plant', x: 0.9, y: 0.22, w: 0.14, h: 0.22 },
    { kind: 'tv', x: 0.78, y: 0.8, w: 0.38, h: 0.29 },
  ],
  keuken: [
    { kind: 'table', x: 0.27, y: 0.75, w: 0.46, h: 0.28 },
    { kind: 'fridge', x: 0.88, y: 0.28, w: 0.17, h: 0.31 },
    { kind: 'plant', x: 0.1, y: 0.2, w: 0.13, h: 0.2 },
  ],
  slaapkamer: [
    { kind: 'bed', x: 0.22, y: 0.25, w: 0.5, h: 0.3 },
    { kind: 'toybox', x: 0.82, y: 0.78, w: 0.26, h: 0.24 },
    { kind: 'plant', x: 0.9, y: 0.2, w: 0.13, h: 0.2 },
  ],
  disco: [
    { kind: 'djbooth', x: 0.5, y: 0.13, w: 0.52, h: 0.26 },
    { kind: 'speaker', x: 0.08, y: 0.75, w: 0.17, h: 0.3 },
    { kind: 'speaker', x: 0.92, y: 0.75, w: 0.17, h: 0.3 },
  ],
};
// James de kat: snelheid per kamer (px per seconde als deel van de breedte).
const CAT_SPEED = { woonkamer: 0.07, keuken: 0.085, slaapkamer: 0.1, disco: 0.12 };
const CAT_PENALTY_MS = 3000;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Duw een cirkel (o, straal r) uit een rechthoek; geeft de normaal terug bij botsing.
function pushOut(o, r, rc) {
  const cx = clamp(o.x, rc.l, rc.r);
  const cy = clamp(o.y, rc.t, rc.b);
  let dx = o.x - cx;
  let dy = o.y - cy;
  let d = Math.hypot(dx, dy);
  if (d >= r) return null;
  if (d === 0) {
    // middelpunt zit erin: kortste weg naar buiten
    const opts = [[o.x - rc.l, -1, 0], [rc.r - o.x, 1, 0], [o.y - rc.t, 0, -1], [rc.b - o.y, 0, 1]];
    const [, nx, ny] = opts.sort((a, b) => a[0] - b[0])[0];
    o.x = nx ? (nx < 0 ? rc.l - r : rc.r + r) : o.x;
    o.y = ny ? (ny < 0 ? rc.t - r : rc.b + r) : o.y;
    return { nx, ny };
  }
  dx /= d;
  dy /= d;
  o.x = cx + dx * r;
  o.y = cy + dy * r;
  return { nx: dx, ny: dy };
}

function bounce(b, n) {
  const dot = b.vx * n.nx + b.vy * n.ny;
  if (dot < 0) { b.vx -= 2 * dot * n.nx; b.vy -= 2 * dot * n.ny; }
}

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
      ${(LAYOUT[rm.id] || []).map((p) => `<div class="prop prop-${p.kind}">${p.kind === 'speaker' ? speakerArt(activeSpeaker()) : furnitureSVG(p.kind)}</div>`).join('')}
      <div class="james walk"><div class="james-flip">${catSVG()}</div><div class="bubble"></div></div>
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
  const propEls = [...el.querySelectorAll('.prop')];
  let props = [];             // botsrechthoeken van de meubels
  const catEl = $('.james');
  const catFlip = $('.james-flip');
  const catBubble = $('.james .bubble');
  const cat = { x: 0, y: 0, r: 30, tx: 0, ty: 0, face: 1, state: 'walk', until: 0, fleeUntil: 0, safeUntil: 0, stuck: 0 };
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
    cat.r = henry.r * 0.75;
    layoutProps();
  }

  // Zet de meubels neer en bereken hun botsrechthoek (iets kleiner dan de tekening).
  function layoutProps() {
    const U = Math.min(W, H);
    props = (LAYOUT[rm.id] || []).map((p, i) => {
      const w = p.w * U;
      const hh = p.h * U;
      const x = clamp(p.x * W, w / 2 + 6, W - w / 2 - 6);
      const y = clamp(p.y * H, hh / 2 + 6, H - hh / 2 - 6);
      const e = propEls[i];
      e.style.width = `${w}px`;
      e.style.height = `${hh}px`;
      e.style.transform = `translate(${x - w / 2}px, ${y - hh / 2}px)`;
      const ix = w * 0.06;
      const iy = hh * 0.08;
      return { l: x - w / 2 + ix, r: x + w / 2 - ix, t: y - hh / 2 + iy, b: y + hh / 2 - iy };
    });
  }

  const inProp = (x, y, r) => props.some((rc) => pushOut({ x, y }, r, rc));
  const solid = (o, r) => { let n = null; props.forEach((rc) => { n = pushOut(o, r, rc) || n; }); return n; };

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

  function spawnBall(value, good) {
    const r = ballSize() / 2;
    let x = 0;
    let y = 0;
    for (let i = 0; i < 40; i++) {
      x = r + Math.random() * (W - 2 * r);
      y = r + Math.random() * (H - 2 * r);
      const farHenry = Math.hypot(x - henry.x, y - henry.y) > henry.r + r + 110;
      const farOthers = balls.every((b) => b.dead || Math.hypot(x - b.x, y - b.y) > b.r + r + 14);
      const free = !inProp(x, y, r + 6) && Math.hypot(x - cat.x, y - cat.y) > cat.r + r + 20;
      if (farHenry && farOthers && free) break;
    }
    const a = Math.random() * Math.PI * 2;
    const sp = rm.speed * (0.6 + Math.random() * 0.6);
    const b = {
      x, y, r, value, good, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, base: sp, dead: false,
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

  // Cijfer-modus: alle cijfers van het antwoord liggen meteen klaar (plus een
  // paar andere cijfers); er wordt niets opnieuw neergelegd tussen de cijfers.
  function layoutBalls() {
    clearBalls();
    if (digits) {
      const ans = String(q.answer).split('');
      const others = shuffle('0123456789'.split('').filter((d) => !ans.includes(d)))
        .slice(0, Math.max(2, rm.balls - ans.length));
      ans.forEach((d) => spawnBall(d, true));
      others.forEach((d) => spawnBall(d, false));
    } else {
      spawnBall(q.answer, true);
      decoys(q, rm.balls - 1).forEach((v) => spawnBall(v, false));
    }
    if (wrongs >= 2) hintBall();
  }

  // Goed = het cijfer (of getal) dat nu aan de beurt is.
  const isGood = (b) => (digits ? b.value === needed() : b.good);

  function hintBall() {
    balls.forEach((b) => b.el.classList.toggle('hint', !b.dead && isGood(b)));
  }

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

  function sneeze() {
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
    if (wrongs >= 2) hintBall();
  }

  function swallow(b) {
    b.dead = true;
    b.el.classList.add('sucked');
    b.el.style.transform = `translate(${henry.x - b.r}px, ${henry.y - b.r}px) scale(0.1)`;
    setTimeout(() => b.el.remove(), 260);
    balls = balls.filter((x) => x !== b);
  }

  function suck(b) {
    const now = performance.now();
    if ((b.noHitUntil || 0) > now) return;

    if (!isGood(b)) {
      if (digits) {
        // Fout cijfer: wegblazen, maar blijft liggen (er verspringt niets).
        const dx = b.x - henry.x;
        const dy = b.y - henry.y;
        const d = Math.hypot(dx, dy) || 1;
        b.x = henry.x + (dx / d) * (henry.r + b.r + 30);
        b.y = henry.y + (dy / d) * (henry.r + b.r + 30);
        const sp = Math.max(160, rm.speed * 4);
        b.vx = (dx / d) * sp;
        b.vy = (dy / d) * sp;
        b.slowDown = true;
        b.noHitUntil = now + 900;
        sneeze();
        return;
      }
      swallow(b);
      sneeze();
      if (balls.filter((x) => !x.dead).length <= 1) later(layoutBalls, 400);
      return;
    }

    swallow(b);
    if (digits && filled.length + 1 < String(q.answer).length) {
      filled += b.value;
      sfx.slurp(streak);
      showAns();
      if (wrongs >= 2) hintBall();
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

  // ---------- James de kat ----------
  function catTarget(awayFrom = null) {
    for (let i = 0; i < 30; i++) {
      const x = cat.r + Math.random() * (W - 2 * cat.r);
      const y = cat.r + Math.random() * (H - 2 * cat.r);
      if (inProp(x, y, cat.r + 8)) continue;
      if (awayFrom && Math.hypot(x - awayFrom.x, y - awayFrom.y) < Math.min(W, H) * 0.45) continue;
      cat.tx = x;
      cat.ty = y;
      return;
    }
  }

  function placeCat() {
    // Start in een hoek, ver van Henry.
    const corners = shuffle([[0.1, 0.5], [0.9, 0.5], [0.5, 0.9], [0.3, 0.1], [0.7, 0.9]]);
    for (const [fx, fy] of corners) {
      const x = fx * W;
      const y = fy * H;
      if (!inProp(x, y, cat.r + 8) && Math.hypot(x - henry.x, y - henry.y) > Math.min(W, H) * 0.3) {
        cat.x = x;
        cat.y = y;
        break;
      }
    }
    catTarget();
  }

  function updateCat(dt, now) {
    const fleeing = now < cat.fleeUntil;
    if (cat.state === 'sit' && now > cat.until) { cat.state = 'walk'; catTarget(); }
    if (cat.state === 'walk') {
      const dx = cat.tx - cat.x;
      const dy = cat.ty - cat.y;
      const d = Math.hypot(dx, dy);
      const sp = W * (CAT_SPEED[rm.id] || 0.08) * (fleeing ? 3.5 : 1);
      if (d < 6) {
        if (!fleeing && Math.random() < 0.45) { cat.state = 'sit'; cat.until = now + 1500 + Math.random() * 2500; }
        else catTarget();
      } else {
        const ox = cat.x;
        const oy = cat.y;
        cat.x += (dx / d) * Math.min(d, sp * dt);
        cat.y += (dy / d) * Math.min(d, sp * dt);
        if (Math.abs(dx) > 2) cat.face = dx < 0 ? -1 : 1;
        solid(cat, cat.r);
        cat.x = clamp(cat.x, cat.r, W - cat.r);
        cat.y = clamp(cat.y, cat.r, H - cat.r);
        // vastgelopen tegen een meubel? nieuw doel kiezen
        cat.stuck = Math.hypot(cat.x - ox, cat.y - oy) < sp * dt * 0.3 ? cat.stuck + dt : 0;
        if (cat.stuck > 0.4) { cat.stuck = 0; catTarget(); }
      }
    }
    catEl.classList.toggle('walk', cat.state === 'walk');
    catEl.classList.toggle('flee', fleeing);
    const w = cat.r * 3.4;
    catEl.style.width = `${w}px`;
    catEl.style.transform = `translate(${cat.x - w / 2}px, ${cat.y - w * 0.42}px)`;
    catFlip.style.transform = `scaleX(${cat.face})`;

    // Henry raakt James aan?
    if (now > cat.safeUntil && Math.hypot(henry.x - cat.x, henry.y - cat.y) < henry.r * 0.8 + cat.r * 0.8) catHit(now);
  }

  function catHit(now) {
    cat.safeUntil = now + 2500;
    cat.fleeUntil = now + 1400;
    cat.state = 'walk';
    catTarget(henry);
    endAt -= CAT_PENALTY_MS;
    streak = 0;
    level = Math.max(2, level - 1);
    music.setLevel(level);
    sneezeUntil = now + 1300;
    sfx.meow();
    catBubble.textContent = 'MIAUW! 🙀';
    catBubble.classList.remove('pop');
    void catBubble.offsetWidth;
    catBubble.classList.add('pop');
    setTimeout(() => { catBubble.textContent = ''; }, 1300);
    say('Oeps! Sorry James!', 'sad');
    // Henry schrikt en stuitert een stukje terug
    const dx = henry.x - cat.x;
    const dy = henry.y - cat.y;
    const d = Math.hypot(dx, dy) || 1;
    henry.x += (dx / d) * 40;
    henry.y += (dy / d) * 40;
    target.x = henry.x;
    target.y = henry.y;
    floatText(arena, '−3 sec ⏱️', 'penalty');
    $('.timebar').classList.add('hit');
    later(() => $('.timebar').classList.remove('hit'), 600);
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
    // Meubels: Henry glijdt er langs, maar kan er niet doorheen.
    henry.x = clamp(henry.x, henry.r * 0.6, W - henry.r * 0.6);
    henry.y = clamp(henry.y, henry.r * 0.6, H - henry.r * 0.6);
    solid(henry, henry.r * 0.75);
    updateCat(dt, now);
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
      if (b.slowDown) {
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > b.base) { b.vx *= 0.96; b.vy *= 0.96; } else b.slowDown = false;
      }
      const n = solid(b, b.r);
      if (n) bounce(b, n);
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
      const pn = solid(power, power.r);
      if (pn) bounce(power, pn);
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
  const onResize = () => { measure(); solid(henry, henry.r * 0.75); solid(cat, cat.r); };
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
    placeCat();
    updateCat(0, performance.now());
    const ov = $('.countdown');
    ov.classList.remove('hidden');
    ov.innerHTML = `<div class="race-intro">${digits ? '🔢 Cijfer-modus' : `${rm.emoji} ${rm.name}`}
      <small>Sleep Henry naar het goede antwoord!</small>
      <small class="cat-warn">🐱 Pas op: niet tegen kat James aan botsen!</small>
      ${battery.isEmpty(activeSpeaker().id) ? '<small class="cat-warn">🪫 PartyBox leeg: geen muziek. Laad hem op bij 🔋 Opladen!</small>' : ''}</div>`;
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
