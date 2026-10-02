// Oefenen: "Partybox Opladen" (rustig, met hulp) en "Turbo-Minuut" (tegen de klok).
import { h, tap, go, numpad, keyboard, floatText, pick, fmt } from '../ui.js';
import { sfx } from '../audio.js';
import { henrySVG, speakerSVG } from '../art.js';
import { makePicker, record } from '../engine.js';
import { findPool, afterRecord } from '../modules/index.js';
import { activeSpeaker, activeHenry, addWatts } from '../rewards.js';
import * as store from '../store.js';
import * as music from '../music.js';

const ROUND = 8;
const TURBO_MS = 60_000;

const PRAISE = ['Goed zo!', 'Top!', 'Yes!', 'Super!', 'Knallen!', 'Bas erop!', 'Lekker bezig!', 'Zo! 💥', 'Henry is blij!'];
const FAST = ['Wat snel!', 'Bliksem! ⚡', 'Turbo!', 'Zoef!'];
const STREAK = { 5: '5 op rij! 🔥', 10: '10 op rij! Niet te stoppen!', 15: '15 op rij!! 🎉', 20: '20 op rij!!! Legende!' };
const OOPS = ['Bijna!', 'Oei, net niet.', 'Geeft niks!'];

export function playScreen({ mode, poolId }) {
  const turbo = mode === 'turbo';
  const pool = findPool(poolId);
  const next = makePicker(pool.items);
  const sp = activeSpeaker();
  const hn = activeHenry();

  let q = null;
  let input = '';
  let t0 = 0;
  let lastAt = Date.now();
  let streak = 0;
  let charge = 0;
  let correct = 0;
  let earned = 0;
  let qCount = 0;
  let fixing = false;      // na een fout: eerst het goede antwoord intypen
  let busy = true;
  let ended = false;
  let goalReached = false;
  const retry = [];        // fout beantwoorde sommen komen later terug
  const newSpeakers = [];
  const messages = [];
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const meter = turbo
    ? `<div class="timebar"><i></i></div><div class="score">0</div>`
    : `<div class="battery">${'<i></i>'.repeat(ROUND)}</div>`;

  const el = h(`<div>
    <header class="bar">
      <button class="icon-btn back" aria-label="Stoppen">✕</button>
      <div class="meter">${meter}</div>
      <div class="pill watts">⚡ <b>0</b></div>
    </header>
    <div class="play">
      <div class="stage">
        <div class="speaker-wrap" style="--charge:0">${speakerSVG(sp)}</div>
        <div class="henry-wrap"><div class="henry-holder">${henrySVG(hn.color)}</div><div class="bubble"></div></div>
      </div>
      <div class="panel">
        <div class="qcard"><span class="qtext"></span><span class="eq">=</span><span class="answer"></span></div>
        <div class="hint hidden"></div>
      </div>
    </div>
    <div class="overlay countdown hidden"></div>
  </div>`);

  const $ = (s) => el.querySelector(s);
  const qtext = $('.qtext');
  const answer = $('.answer');
  const qcard = $('.qcard');
  const hintEl = $('.hint');
  const bubble = $('.bubble');
  const holder = $('.henry-holder');
  const spWrap = $('.speaker-wrap');
  const wattsEl = $('.watts b');
  const pad = numpad(onKey);
  $('.panel').appendChild(pad);
  const unkey = keyboard(onKey);

  tap($('.back'), () => finish(true));

  function say(text, mood = 'happy') {
    bubble.textContent = text;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    holder.innerHTML = henrySVG(hn.color, { mood });
  }

  function show() {
    const due = retry.findIndex((r) => r.at <= qCount);
    q = due >= 0 ? retry.splice(due, 1)[0].q : next();
    qCount++;
    input = '';
    qtext.textContent = q.text;
    answer.textContent = '';
    qcard.classList.remove('good', 'bad');
    qcard.classList.add('enter');
    later(() => qcard.classList.remove('enter'), 250);
    t0 = performance.now();
    busy = false;
  }

  function onKey(k) {
    if (busy || ended) return;
    if (k === 'del') { input = input.slice(0, -1); }
    else if (k === 'ok') { if (input) check(); return; }
    else if (input.length < 3) { input += k; sfx.key(); }
    answer.textContent = input;
    if (input.length >= String(q.answer).length && Number(input) === q.answer) check();
    else if (input.length === String(q.answer).length && !fixing) check();
  }

  function addTime() {
    const t = Date.now();
    const dt = Math.min(t - lastAt, 30_000) / 1000;
    lastAt = t;
    if (store.addPlayTime(dt)) goalReached = true;
  }

  function gain(n) {
    earned += n;
    wattsEl.textContent = fmt(earned);
    newSpeakers.push(...addWatts(n));
    floatText(el.querySelector('.stage'), `+${n} ⚡`, 'watt');
  }

  function check() {
    busy = true;
    const ms = performance.now() - t0;
    const ok = Number(input) === q.answer;
    addTime();

    if (fixing) {
      if (ok) {
        fixing = false;
        hintEl.classList.add('hidden');
        qcard.classList.add('good');
        say('Precies! Hij komt straks nog een keer.');
        later(show, 900);
      } else {
        input = '';
        answer.textContent = '';
        qcard.classList.add('shake');
        later(() => qcard.classList.remove('shake'), 400);
        busy = false;
      }
      return;
    }

    record(q.key, ok, ms, q.fastMs, { jump: q.jump });
    const msg = afterRecord(q.key);
    if (msg) messages.push(msg);

    if (ok) {
      correct++;
      streak++;
      const fast = ms <= q.fastMs;
      gain(10 + (fast ? 5 : 0) + (streak >= 5 ? 5 : 0));
      sfx.correct(streak);
      qcard.classList.add('good');
      spWrap.classList.remove('thump');
      void spWrap.offsetWidth;
      spWrap.classList.add('thump');
      say(STREAK[streak] || (fast && Math.random() < 0.5 ? pick(FAST) : pick(PRAISE)), streak >= 5 ? 'wow' : 'happy');
      if (turbo) {
        el.querySelector('.score').textContent = correct;
        later(show, 250);
      } else {
        charge++;
        spWrap.style.setProperty('--charge', charge / ROUND);
        el.querySelectorAll('.battery i').forEach((b, i) => b.classList.toggle('on', i < charge));
        if (charge >= ROUND) later(() => finish(false), 700);
        else later(show, 650);
      }
    } else {
      streak = 0;
      sfx.wrong();
      qcard.classList.add('bad');
      if (turbo) {
        answer.textContent = q.answer;
        say(pick(OOPS), 'sad');
        later(show, 900);
      } else {
        retry.push({ q, at: qCount + 3 });
        fixing = true;
        say(`${pick(OOPS)} Zo kun je het doen:`, 'sad');
        hintEl.innerHTML = `${q.hint.map((l) => `<div>${l}</div>`).join('')}
          <div class="hint-answer">${q.text} = <b>${q.answer}</b></div>
          <div class="hint-todo">Typ nu ${q.answer} 👇</div>`;
        hintEl.classList.remove('hidden');
        later(() => {
          input = '';
          answer.textContent = '';
          qcard.classList.remove('bad');
          busy = false;
        }, 700);
      }
    }
    store.save();
  }

  function finish(quit) {
    if (ended) return;
    ended = true;
    busy = true;
    store.save();
    if (quit && correct === 0) { go('home'); return; }
    const lines = [`${correct} goed`, `+${fmt(earned)} ⚡ verdiend`];
    let title = quit ? 'Goed gedaan!' : 'Partybox opgeladen!';
    if (turbo) {
      const prev = store.get().records[poolId] || 0;
      if (!quit) title = `${correct} in één minuut!`;
      if (correct > prev && !quit) {
        store.get().records[poolId] = correct;
        lines.unshift(prev ? `🏆 Nieuw record! (was ${prev})` : '🏆 Je eerste record!');
      } else if (prev) {
        lines.push(`Record: ${prev}`);
      }
      store.save();
    }
    go('party', {
      title,
      lines,
      big: goalReached,
      newSpeakers,
      messages,
      again: quit ? null : { screen: 'play', args: { mode, poolId } },
    });
  }

  function startTurbo() {
    const ov = $('.countdown');
    ov.classList.remove('hidden');
    let n = 3;
    const tick = () => {
      if (n > 0) { ov.textContent = n; sfx.tick(); n--; later(tick, 700); return; }
      ov.textContent = 'GO!';
      sfx.whistle();
      music.play('techno', { level: 3 });
      later(() => {
        ov.classList.add('hidden');
        const start = performance.now();
        const bar = $('.timebar i');
        let lastSec = 60;
        const iv = setInterval(() => {
          const left = TURBO_MS - (performance.now() - start);
          bar.style.transform = `scaleX(${Math.max(0, left / TURBO_MS)})`;
          const sec = Math.ceil(left / 1000);
          if (sec <= 10 && sec < lastSec && sec > 0) sfx.tick();
          if (sec === 10 && lastSec > 10) { music.setTempo(1.1); music.setLevel(5); }
          lastSec = sec;
          bar.classList.toggle('low', left < 10_000);
          if (left <= 0) { clearInterval(iv); addTime(); finish(false); }
        }, 100);
        timers.push(iv);
        lastAt = Date.now();
        show();
      }, 500);
    };
    tick();
  }

  if (turbo) {
    say('Klaar voor de Turbo-Minuut?');
    later(startTurbo, 600);
  } else {
    say(pick(['Laden maar!', 'Help je mij de speaker op te laden?', 'Elke goede som = meer bas!']));
    later(show, 400);
  }

  return {
    el,
    leave() {
      ended = true;
      timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      unkey();
      music.stop(0.3);
    },
  };
}
