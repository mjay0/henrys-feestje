// Eerste keer spelen: een korte "soundcheck" die bepaalt waar Lewis begint.
import { h, tap, go, numpad, keyboard } from '../ui.js';
import { sfx } from '../audio.js';
import { henrySVG } from '../art.js';
import { record } from '../engine.js';
import { MODULES } from '../modules/index.js';
import { activeHenry } from '../rewards.js';
import * as store from '../store.js';

const PER_SKILL = 2;
const TABLE_QS = 6;

export function soundcheckScreen() {
  const hn = activeHenry();
  const tafelItems = MODULES.find((m) => m.id === 'tafels').pools()[0].items()
    .sort(() => Math.random() - 0.5).slice(0, TABLE_QS);
  const tracks = MODULES.flatMap((m) => m.placementTracks || []);
  const passed = Object.fromEntries(tracks.map((t) => [t.track, 0]));
  const total = TABLE_QS + tracks.reduce((s, t) => s + t.skills.length * PER_SKILL, 0);

  let ti = -1;         // -1 = tafels, daarna index in tracks
  let si = 0;          // stap binnen het spoor
  let inSkill = 0;     // hoeveel vragen al in deze stap
  let skillOk = true;
  let asked = 0;
  let q = null;
  let input = '';
  let busy = true;
  let lastAt = Date.now();
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const el = h(`<div>
    <div class="soundcheck">
      <div class="henry-wrap"><div class="bubble pop">Soundcheck! 🎤 Ik wil weten wat je al kunt. Fout is helemaal niet erg!</div>
        <div class="henry-holder">${henrySVG(hn.color, { mood: 'wow' })}</div></div>
      <div class="sc-body">
        <button class="btn primary huge go">Start de soundcheck</button>
      </div>
    </div>
  </div>`);
  const bubble = el.querySelector('.bubble');
  const holder = el.querySelector('.henry-holder');
  const body = el.querySelector('.sc-body');
  let unkey = () => {};

  tap(el.querySelector('.go'), begin);

  function begin() {
    body.innerHTML = `<div class="eq-meter"><i></i></div>
      <div class="qcard"><span class="qtext"></span><span class="eq">=</span><span class="answer"></span></div>`;
    body.appendChild(numpad(onKey));
    unkey = keyboard(onKey);
    bubble.textContent = 'Eerst een paar tafels…';
    nextQ();
  }

  function nextQ() {
    if (ti === -1) {
      if (asked < TABLE_QS) return showQ(tafelItems[asked].make());
      ti = 0;
      if (tracks[0]) bubble.textContent = 'Nu wat plus- en minsommen!';
    }
    while (ti < tracks.length) {
      const t = tracks[ti];
      if (si < t.skills.length && skillOk) return showQ(t.skills[si].make());
      ti++; si = 0; inSkill = 0; skillOk = true;
    }
    done();
  }

  function showQ(question) {
    q = question;
    input = '';
    el.querySelector('.qtext').textContent = q.text;
    el.querySelector('.answer').textContent = '';
    el.querySelector('.qcard').classList.remove('good', 'bad');
    el.querySelector('.eq-meter i').style.width = `${Math.min(100, (asked / total) * 100)}%`;
    q.t0 = performance.now();
    busy = false;
  }

  function onKey(k) {
    if (busy) return;
    if (k === 'del') input = input.slice(0, -1);
    else if (k === 'ok') { if (input) answer(); return; }
    else if (input.length < 3) { input += k; sfx.key(); }
    el.querySelector('.answer').textContent = input;
    if (input.length === String(q.answer).length) answer();
  }

  function answer() {
    busy = true;
    const ok = Number(input) === q.answer;
    record(q.key, ok, performance.now() - q.t0, q.fastMs, { jump: true });
    const t = Date.now();
    store.addPlayTime(Math.min(t - lastAt, 30_000) / 1000);
    lastAt = t;
    asked++;
    el.querySelector('.qcard').classList.add(ok ? 'good' : 'bad');
    if (ok) { sfx.correct(0); bubble.textContent = 'Goed! 🎵'; holder.innerHTML = henrySVG(hn.color); }
    else {
      sfx.tap();
      el.querySelector('.answer').textContent = q.answer;
      bubble.textContent = 'Oké, die onthoud ik!';
    }
    if (ti >= 0) {
      inSkill++;
      if (!ok) skillOk = false;
      if (inSkill >= PER_SKILL) {
        if (skillOk) { passed[tracks[ti].track]++; si++; }
        inSkill = 0;
      }
    }
    later(nextQ, ok ? 600 : 1400);
  }

  function done() {
    const s = store.get();
    tracks.forEach((t) => { s.unlockedSkills[t.track] = Math.min(t.skills.length, passed[t.track] + 1); });
    s.soundcheckDone = true;
    store.save();
    go('party', {
      title: 'Soundcheck klaar! 🎤',
      lines: ['Henry weet nu wat je al kunt.', 'Laten we de speaker gaan opladen!'],
    });
  }

  return {
    el,
    leave() { timers.forEach(clearTimeout); unkey(); },
  };
}
