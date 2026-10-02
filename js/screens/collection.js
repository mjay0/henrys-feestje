// "Mijn speakers": showroom met podium voor de speakers, plus Henry's en DJ.
import { h, tap, go, fmt, confetti } from '../ui.js';
import { sfx } from '../audio.js';
import { henrySVG, speakerSVG, LIGHT_SHOWS } from '../art.js';
import { SPEAKERS, HENRYS, isUnlocked, songUnlocked, stats, lightsOf, isPlug, capacity } from '../rewards.js';
import { SONGS } from '../songs.js';
import * as music from '../music.js';
import * as battery from '../battery.js';
import * as store from '../store.js';

const bars = (n) => `<span class="stat-bar">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

function showroom(el, s, timers) {
  let view = Math.max(0, SPEAKERS.findIndex((x) => x.id === s.speaker));
  const room = h(`<div class="showroom">
    <div class="stage-area">
      <button class="nav nav-prev" aria-label="Vorige">◀</button>
      <div class="podium">
        <div class="spot"></div>
        <div class="show-speaker speaker-wrap"></div>
        <div class="podium-base"></div>
      </div>
      <button class="nav nav-next" aria-label="Volgende">▶</button>
    </div>
    <div class="spec"></div>
    <div class="thumbs">${SPEAKERS.map((sp, i) => `<button class="thumb" data-i="${i}">
      <span class="speaker-wrap" style="--charge:${isUnlocked(sp) ? 0.6 : 0}">${speakerSVG(sp, lightsOf(sp.id))}</span></button>`).join('')}</div>
  </div>`);
  el.querySelector('.collection').replaceWith(room);
  const show = room.querySelector('.show-speaker');
  const spec = room.querySelector('.spec');
  let previewTimer = null;

  function render(anim = '') {
    const sp = SPEAKERS[view];
    const open = isUnlocked(sp);
    const active = s.speaker === sp.id;
    const st = stats(sp);
    show.className = `show-speaker speaker-wrap ${open ? '' : 'locked'} ${anim}`;
    show.style.setProperty('--charge', open ? (active ? Math.max(0.15, battery.level(sp.id) / 100) : 0.5) : 0);
    show.innerHTML = speakerSVG(sp, lightsOf(sp.id));
    const mins = Math.round(capacity(sp) / 60);
    spec.innerHTML = `
      <h2>${open ? sp.name : `🔒 ${sp.name}`}</h2>
      <div class="stats">
        <div>🔊 Bas ${bars(st.bas)}</div>
        <div>💡 Licht ${bars(st.licht)}</div>
        <div>🔋 Batterij ${bars(st.batterij)} <small>${isPlug(sp) ? '🔌 stekker: altijd vol!' : `±${mins} min muziek`}</small></div>
      </div>
      ${open ? `<div class="batt-row">Nu: ${battery.badge(sp.id)}</div>
        <div class="light-shows">${Object.entries(LIGHT_SHOWS).map(([k, v]) =>
          `<button class="chip ${lightsOf(sp.id) === k ? 'on' : ''}" data-show="${k}">${v.emoji} ${v.name}</button>`).join('')}</div>` : ''}
      <div class="actions">${open
        ? (active ? '<button class="btn on-now" disabled>🔊 Staat aan</button>' : '<button class="btn primary turn-on">⚡ Zet aan!</button>')
        : `<button class="btn" disabled>Nog ${fmt(sp.w - s.watts)} ⚡ nodig</button>`}</div>`;
    room.querySelectorAll('.thumb').forEach((t, i) => {
      t.classList.toggle('sel', i === view);
      t.classList.toggle('active', SPEAKERS[i].id === s.speaker);
      t.classList.toggle('locked', !isUnlocked(SPEAKERS[i]));
    });
    room.querySelector('.thumb.sel')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    spec.querySelectorAll('[data-show]').forEach((b) => tap(b, () => {
      s.lights[sp.id] = b.dataset.show;
      store.save();
      sfx.pop();
      room.querySelectorAll('.thumb .speaker-wrap')[view].innerHTML = speakerSVG(sp, b.dataset.show);
      render('flash');
    }, { sound: false }));
    const on = spec.querySelector('.turn-on');
    if (on) tap(on, () => turnOn(sp), { sound: false });
  }

  // Aanzetten: speaker valt met een BOEM op het podium, lichten aan, stukje muziek.
  function turnOn(sp) {
    s.speaker = sp.id;
    store.save();
    music.stop(0.2);
    clearTimeout(previewTimer);
    render('drop');
    show.style.setProperty('--charge', 0);
    timers.push(setTimeout(() => {
      sfx.boom();
      room.classList.add('shake');
      timers.push(setTimeout(() => room.classList.remove('shake'), 400));
    }, 380));
    timers.push(setTimeout(() => {
      if (battery.isEmpty(sp.id)) {
        show.classList.add('flicker');
        sfx.batteryEmpty();
        battery.toast('🪫 Deze PartyBox is leeg! Laad hem op bij <b>🔋 Opladen</b>');
        return;
      }
      sfx.powerOn();
      show.style.setProperty('--charge', 1);
      confetti(room, 50);
      if (music.play(s.song, { mode: 'party', drop: true, onKick: () => { show.classList.remove('thump'); void show.offsetWidth; show.classList.add('thump'); } })) {
        previewTimer = setTimeout(() => music.stop(1.2), 7000);
      }
    }, 900));
  }

  const go2 = (d) => { view = (view + d + SPEAKERS.length) % SPEAKERS.length; sfx.tap(); render(d > 0 ? 'from-right' : 'from-left'); };
  tap(room.querySelector('.nav-prev'), () => go2(-1), { sound: false });
  tap(room.querySelector('.nav-next'), () => go2(1), { sound: false });
  room.querySelectorAll('.thumb').forEach((t) => tap(t, () => { view = Number(t.dataset.i); render('from-right'); }));
  // Vegen over het podium
  let x0 = null;
  const area = room.querySelector('.stage-area');
  area.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  area.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) go2(dx < 0 ? 1 : -1);
  });
  // Tik op de speaker die aan staat: bas-boem
  tap(show, () => {
    const sp = SPEAKERS[view];
    if (s.speaker !== sp.id || battery.isEmpty(sp.id)) return;
    sfx.correct(2);
    show.classList.remove('thump'); void show.offsetWidth; show.classList.add('thump');
  }, { sound: false });
  render();
  return () => clearTimeout(previewTimer);
}

export function collectionScreen({ tab = 'speakers' } = {}) {
  const s = store.get();
  const owned = SPEAKERS.filter(isUnlocked).length;
  const timers = [];

  const henrys = HENRYS.map((x) => {
    const open = s.henrys.includes(x.id);
    return `<button class="card ${open ? '' : 'locked'} ${s.henry === x.id ? 'active' : ''}" data-henry="${x.id}">
      <div class="henry-wrap">${henrySVG(open ? x.color : '#555555')}</div>
      <div class="card-name">${open ? x.name : '???'}</div>
      <small>${open ? (s.henry === x.id ? '✔ Gekozen' : 'Tik om te kiezen') : `🔒 ${x.how}`}</small>
    </button>`;
  }).join('');

  const songs = SONGS.map((x) => {
    const open = songUnlocked(x);
    return `<button class="card song ${open ? '' : 'locked'} ${s.song === x.id ? 'active' : ''}" data-song="${x.id}">
      <div class="song-icon">${open ? x.emoji : '🎵'}</div>
      <div class="card-name">${open ? x.name : '???'}</div>
      <small>${open ? (s.song === x.id ? '🎧 Draait op het feest' : `${x.style} · tik om te draaien`) : `🔒 ${fmt(x.w)} ⚡`}</small>
    </button>`;
  }).join('');
  const body = { speakers: '', henrys, songs }[tab];

  const el = h(`<div>
    <header class="bar">
      <button class="icon-btn back" aria-label="Terug">←</button>
      <div class="tabs">
        <button class="tab ${tab === 'speakers' ? 'on' : ''}" data-tab="speakers">🔊 Speakers ${owned}/${SPEAKERS.length}</button>
        <button class="tab ${tab === 'henrys' ? 'on' : ''}" data-tab="henrys">🧹 Henry's ${s.henrys.length}/${HENRYS.length}</button>
        <button class="tab ${tab === 'songs' ? 'on' : ''}" data-tab="songs">🎧 DJ</button>
      </div>
      <div class="pill watts">⚡ <b>${fmt(s.watts)}</b></div>
    </header>
    <div class="collection">${body}</div>
  </div>`);

  let cleanup = null;
  if (tab === 'speakers') cleanup = showroom(el, s, timers);

  tap(el.querySelector('.back'), () => go('home'));
  el.querySelectorAll('[data-tab]').forEach((b) => tap(b, () => go('collection', { tab: b.dataset.tab })));
  el.querySelectorAll('[data-henry]').forEach((b) => tap(b, () => {
    if (!s.henrys.includes(b.dataset.henry)) { sfx.wrong(); return; }
    s.henry = b.dataset.henry;
    store.save();
    sfx.henry();
    go('collection', { tab });
  }, { sound: false }));
  el.querySelectorAll('[data-song]').forEach((b) => tap(b, () => {
    const x = SONGS.find((y) => y.id === b.dataset.song);
    if (!songUnlocked(x)) { sfx.wrong(); return; }
    s.song = x.id;
    store.save();
    el.querySelectorAll('[data-song]').forEach((c) => c.classList.toggle('active', c === b));
    el.querySelectorAll('[data-song] small').forEach((c) => {
      const y = SONGS.find((z) => z.id === c.parentElement.dataset.song);
      if (songUnlocked(y)) c.textContent = y.id === x.id ? '🎧 Draait op het feest' : `${y.style} · tik om te draaien`;
    });
    if (!music.play(x.id, { level: 5 })) battery.toast('🪫 De PartyBox is leeg! Laad hem op bij <b>🔋 Opladen</b>');
  }, { sound: false }));
  return {
    el,
    leave: () => { music.stop(0.4); timers.forEach(clearTimeout); cleanup?.(); },
  };
}
