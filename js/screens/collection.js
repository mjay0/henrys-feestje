// "Mijn speakers": verzameling speakers en Henry's.
import { h, tap, go, fmt } from '../ui.js';
import { sfx } from '../audio.js';
import { henrySVG, speakerSVG } from '../art.js';
import { SPEAKERS, HENRYS, isUnlocked, songUnlocked } from '../rewards.js';
import { SONGS } from '../songs.js';
import * as music from '../music.js';
import * as store from '../store.js';

export function collectionScreen({ tab = 'speakers' } = {}) {
  const s = store.get();
  const owned = SPEAKERS.filter(isUnlocked).length;

  const speakers = SPEAKERS.map((sp) => {
    const open = isUnlocked(sp);
    return `<button class="card ${open ? '' : 'locked'} ${s.speaker === sp.id ? 'active' : ''}" data-speaker="${sp.id}">
      <div class="speaker-wrap" style="--charge:${open ? 0.8 : 0}">${speakerSVG(sp)}</div>
      <div class="card-name">${sp.name.replace('PartyBox ', '')}</div>
      <small>${open ? (s.speaker === sp.id ? '🔊 Staat aan' : 'Tik om aan te zetten') : `🔒 ${fmt(sp.w)} ⚡`}</small>
    </button>`;
  }).join('');

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
  const body = { speakers, henrys, songs }[tab];

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

  tap(el.querySelector('.back'), () => go('home'));
  el.querySelectorAll('[data-tab]').forEach((b) => tap(b, () => go('collection', { tab: b.dataset.tab })));
  el.querySelectorAll('[data-speaker]').forEach((b) => tap(b, () => {
    const sp = SPEAKERS.find((x) => x.id === b.dataset.speaker);
    if (!isUnlocked(sp)) { sfx.wrong(); return; }
    s.speaker = sp.id;
    store.save();
    sfx.correct(3);
    go('collection', { tab });
  }, { sound: false }));
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
    music.play(x.id, { level: 5 });
  }, { sound: false }));
  return { el, leave: () => music.stop(0.4) };
}
