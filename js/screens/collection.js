// "Mijn speakers": verzameling speakers en Henry's.
import { h, tap, go, fmt } from '../ui.js';
import { sfx } from '../audio.js';
import { henrySVG, speakerSVG } from '../art.js';
import { SPEAKERS, HENRYS, isUnlocked } from '../rewards.js';
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

  const el = h(`<div>
    <header class="bar">
      <button class="icon-btn back" aria-label="Terug">←</button>
      <div class="tabs">
        <button class="tab ${tab === 'speakers' ? 'on' : ''}" data-tab="speakers">🔊 Speakers ${owned}/${SPEAKERS.length}</button>
        <button class="tab ${tab === 'henrys' ? 'on' : ''}" data-tab="henrys">🧹 Henry's ${s.henrys.length}/${HENRYS.length}</button>
      </div>
      <div class="pill watts">⚡ <b>${fmt(s.watts)}</b></div>
    </header>
    <div class="collection">${tab === 'speakers' ? speakers : henrys}</div>
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
  return { el };
}
