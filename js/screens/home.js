// Startscherm, keuzescherm en het allereerste "Zet de party aan!" scherm.
import { h, tap, go, pick, fmt } from '../ui.js';
import { sfx, unlock } from '../audio.js';
import * as music from '../music.js';
import { henrySVG } from '../art.js';
import * as battery from '../battery.js';
import { activeSpeaker, activeHenry, nextSpeaker, SPEAKERS, speakerArt, isPlug, ROOMS, roomOpen, room as findRoom, digitsOpen, DIGITS_HOW } from '../rewards.js';
import { progress, MAX_BOX, mastery } from '../engine.js';
import { MODULES } from '../modules/index.js';
import { bonusTable } from '../modules/tafels.js';
import * as store from '../store.js';

const HELLO = [
  'Hoi Lewis! Zullen we feesten?',
  'Ik heb zin in een feestje!',
  'Laden we de speaker op?',
  'Ik ben er klaar voor! Jij ook?',
  'Meer sommen = meer BAS!',
  'Wie gaat er vandaag een record halen?',
];

function greeting(sp) {
  if (isPlug(sp)) return pick(HELLO);
  const lv = battery.level(sp.id);
  if (lv <= 0) return 'Oh nee, de PartyBox is leeg! 🪫 Laden we hem op?';
  if (lv <= 20) return 'De batterij is bijna leeg… Even opladen?';
  if (Math.random() < 0.5) return `Vandaag geeft de tafel van ${bonusTable()} dubbele watts! ⚡×2`;
  return pick(HELLO);
}

export function startScreen() {
  const el = h(`<div class="start">
    <div class="start-stage">
      <div class="henry-wrap bounce">${henrySVG(activeHenry().color, { hat: true })}</div>
      <div class="speaker-wrap" style="--charge:0.3">${speakerArt(activeSpeaker())}</div>
    </div>
    <h1 class="logo">Henry's <span>Feestje</span></h1>
    <button class="btn primary huge">🎉 Zet de party aan!</button>
  </div>`);
  tap(el.querySelector('button'), () => {
    unlock();
    sfx.henry();
    music.preload(store.get().song);
    go(store.get().soundcheckDone ? 'home' : 'soundcheck');
  }, { sound: false });
  return { el };
}

export function homeScreen() {
  const s = store.get();
  const sp = activeSpeaker();
  const hn = activeHenry();
  const nxt = nextSpeaker();
  const mins = Math.floor(store.secondsToday() / 60);
  const goalPct = Math.min(1, store.secondsToday() / store.GOAL_SECONDS);
  const streak = store.currentStreak();
  const prevW = Math.max(0, ...SPEAKERS.filter((x) => x.w <= s.watts).map((x) => x.w));
  const pct = nxt ? Math.min(1, (s.watts - prevW) / (nxt.w - prevW)) : 1;

  const el = h(`<div>
    <header class="bar">
      <div class="pill watts">⚡ <b>${fmt(s.watts)}</b></div>
      <div class="pill goal" style="--p:${goalPct}">
        <span class="ring"></span>${goalPct >= 1 ? 'Dagdoel gehaald! ✔' : `Vandaag ${mins}/15 min`}
      </div>
      ${streak ? `<div class="pill">🔥 ${streak}</div>` : ''}
      <h1 class="home-title">Henry's <span>Feestje</span></h1>
      <button class="icon-btn settings" aria-label="Instellingen">⚙️</button>
    </header>
    <div class="home">
      <div class="home-stage">
        <div class="henry-wrap"><div class="bubble pop">${greeting(sp)}</div><div class="henry-holder">${henrySVG(hn.color)}</div></div>
        <div class="speaker-col">
          <div class="speaker-wrap" style="--charge:${battery.level(sp.id) / 100}">${speakerArt(sp)}</div>
          ${battery.badge(sp.id)}
        </div>
      </div>
      <div class="next">
        ${nxt
          ? `<div class="next-label">Nog <b>${fmt(nxt.w - s.watts)} ⚡</b> tot de <b>${nxt.name}</b></div>`
          : '<div class="next-label">Je hebt alle speakers! 🏆</div>'}
        <div class="progress"><i style="width:${pct * 100}%"></i></div>
      </div>
      <div class="menu">
        <button class="btn race big wide" data-go="race">🧹 Stofzuig-Race<small>Zuig het goede antwoord op!</small></button>
        <button class="btn primary big ${!isPlug(sp) && battery.level(sp.id) <= 20 ? 'needs' : ''}" data-go="practice">🔋 PartyBox Opladen<small>${isPlug(sp) ? 'Oefenen met hulp' : battery.level(sp.id) <= 0 ? 'Leeg! Laad op voor muziek' : 'Laad op voor muziek'}</small></button>
        <button class="btn turbo big" data-go="turbo">⏱️ Turbo-Minuut<small>1 minuut, zo snel mogelijk</small></button>
        <button class="btn" data-go="collection">🔊 Mijn speakers</button>
        <button class="btn" data-go="stars">⭐ Mijn sterren</button>
      </div>
    </div>
  </div>`);

  el.querySelectorAll('[data-go]').forEach((b) => tap(b, () => {
    const t = b.dataset.go;
    if (t === 'practice' || t === 'turbo' || t === 'race') go('pick', { mode: t });
    else go(t);
  }));
  tap(el.querySelector('.settings'), () => go('settings'));
  const holder = el.querySelector('.henry-holder');
  const bubble = el.querySelector('.bubble');
  tap(holder, () => {
    sfx.henry();
    holder.innerHTML = henrySVG(hn.color, { mood: 'wow' });
    bubble.textContent = pick(['Hihi, dat kietelt!', 'Vroem vroem!', 'Ik zuig alle sommen op!', 'Zullen we gaan?']);
    setTimeout(() => { holder.innerHTML = henrySVG(hn.color); }, 900);
  }, { sound: false });
  const spw = el.querySelector('.speaker-wrap');
  tap(spw, () => {
    if (battery.isEmpty(sp.id)) {
      sfx.batteryEmpty();
      bubble.textContent = 'De PartyBox is leeg! Laad hem op bij 🔋 Opladen.';
      return;
    }
    sfx.correct(0);
    spw.classList.remove('thump'); void spw.offsetWidth; spw.classList.add('thump');
  }, { sound: false });
  return { el };
}

// Sterren (0-3) of goud voor een groep sommen.
export function starsFor(keys) {
  if (keys.length && keys.every((k) => mastery(k).box >= MAX_BOX)) return '<span class="gold">🏆</span>';
  const p = progress(keys);
  const n = p >= 0.75 ? 3 : p >= 0.45 ? 2 : p >= 0.15 ? 1 : 0;
  return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(3 - n)}</span></span>`;
}

const TITLES = { practice: '🔋 Partybox Opladen', turbo: '⏱️ Turbo-Minuut', race: '🧹 Stofzuig-Race' };

export function pickScreen({ mode }) {
  const s = store.get();
  const race = mode === 'race';
  const digits = race && s.raceDigits && digitsOpen();
  const recordOf = (id) => {
    if (mode === 'turbo') return s.records[id];
    if (race) return s.race.best[`${id}${digits ? ':cijfers' : ''}`];
    return 0;
  };
  const tile = (p) => {
    const keys = p.items().map((i) => i.key);
    const r = recordOf(p.id);
    const rec = r ? `<small>🏆 ${r}</small>` : '';
    return `<button class="tile ${p.big ? 'wide' : ''} ${p.short ? 'small' : ''}" data-pool="${p.id}">
      <span class="tile-name">${p.short ? `<b>${p.short}</b>` : p.name}</span>
      ${p.sub && !p.short ? `<small>${p.sub}</small>` : ''}
      ${starsFor(keys)}${rec}${p.tag ? `<span class="tile-tag ${p.tag.includes('×2') ? 'hot' : ''}">${p.tag}</span>` : ''}</button>`;
  };
  const raceBar = race ? `<section class="race-opts">
      <div class="chips">${ROOMS.map((r) => roomOpen(r)
        ? `<button class="chip ${findRoom(s.raceRoom).id === r.id ? 'on' : ''}" data-room="${r.id}">${r.emoji} ${r.name}</button>`
        : `<span class="chip locked">🔒 ${r.name} <small>na ${r.races} races</small></span>`).join('')}</div>
      ${digitsOpen()
        ? `<button class="chip digits ${digits ? 'on' : ''}" data-digits>🔢 Cijfer-modus ${digits ? 'AAN' : 'uit'}</button>`
        : `<span class="chip locked">🔒 Cijfer-modus <small>${DIGITS_HOW}</small></span>`}
    </section>` : '';
  const el = h(`<div>
    <header class="bar">
      <button class="icon-btn back" aria-label="Terug">←</button>
      <h2>${TITLES[mode]}</h2>
      <span></span>
    </header>
    <div class="pick">
      ${raceBar}
      ${MODULES.map((m) => {
        const pools = m.pools();
        const small = pools.filter((p) => p.short);
        const rest = pools.filter((p) => !p.short);
        return `<section><h3>${m.emoji} ${m.name}</h3>
          <div class="tiles">${rest.map(tile).join('')}</div>
          ${small.length ? `<div class="tiles tables">${small.map(tile).join('')}</div>` : ''}
        </section>`;
      }).join('')}
    </div>
  </div>`);
  tap(el.querySelector('.back'), () => go('home'));
  el.querySelectorAll('[data-pool]').forEach((b) => tap(b, () =>
    (race ? go('race', { poolId: b.dataset.pool }) : go('play', { mode, poolId: b.dataset.pool }))));
  el.querySelectorAll('[data-room]').forEach((b) => tap(b, () => { s.raceRoom = b.dataset.room; store.save(); go('pick', { mode }); }));
  const dg = el.querySelector('[data-digits]');
  if (dg) tap(dg, () => { s.raceDigits = !s.raceDigits; store.save(); go('pick', { mode }); });
  return { el };
}
