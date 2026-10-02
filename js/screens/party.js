// Het feest na een ronde, plus het onthullen van nieuwe speakers en Henry's.
import { h, tap, go, confetti } from '../ui.js';
import { sfx } from '../audio.js';
import * as music from '../music.js';
import { henrySVG, speakerSVG } from '../art.js';
import { activeSpeaker, activeHenry, checkHenrys, newSongs } from '../rewards.js';
import * as store from '../store.js';

export function partyScreen({ title, lines = [], big = false, newSpeakers = [], messages = [], again = null }) {
  const sp = activeSpeaker();
  const hn = activeHenry();
  const queue = [
    ...newSpeakers.map((s) => ({ type: 'speaker', s })),
    ...newSongs().map((x) => ({ type: 'song', s: x })),
    ...checkHenrys().map((x) => ({ type: 'henry', h: x })),
    ...messages.map((text) => ({ type: 'msg', text })),
  ];
  store.save();
  const timers = [];

  if (big) {
    title = 'Feest verdiend! 🎉';
    lines = ['Je hebt vandaag 15 minuten geoefend!', ...lines];
    const st = store.currentStreak();
    if (st > 1) lines.push(`🔥 ${st} dagen op rij!`);
  }

  const el = h(`<div class="party ${big ? 'big' : ''}">
    <div class="disco"></div>
    <div class="party-stage">
      <div class="speaker-wrap" style="--charge:1">${speakerSVG(sp)}</div>
      <div class="henry-wrap dance">${henrySVG(hn.color, { mood: 'wow', hat: true })}</div>
      ${big ? `<div class="speaker-wrap mirror" style="--charge:1">${speakerSVG(sp)}</div>` : ''}
    </div>
    <div class="party-card">
      <h1>${title}</h1>
      ${lines.map((l) => `<p>${l}</p>`).join('')}
      <div class="actions hidden"></div>
    </div>
  </div>`);

  const card = el.querySelector('.party-card');
  const wraps = el.querySelectorAll('.speaker-wrap');
  music.play(store.get().song, {
    mode: 'party',
    onKick: () => {
      wraps.forEach((w) => { w.classList.remove('thump'); void w.offsetWidth; w.classList.add('thump'); });
      el.classList.toggle('flash');
    },
  });
  timers.push(setTimeout(() => music.stop(2), big ? 50_000 : 25_000));
  confetti(el, big ? 140 : 70);
  if (big) timers.push(setTimeout(() => confetti(el, 100), 2500));

  function actions(btns) {
    const a = card.querySelector('.actions');
    a.innerHTML = '';
    btns.forEach(([label, fn, cls = '']) => {
      const b = h(`<button class="btn ${cls}">${label}</button>`);
      tap(b, fn);
      a.appendChild(b);
    });
    a.classList.remove('hidden');
  }

  function endButtons() {
    const btns = [];
    if (again) btns.push(['🔁 Nog een keer', () => go(again.screen, again.args), 'primary']);
    btns.push(['🏠 Naar huis', () => go('home'), again ? '' : 'primary']);
    actions(btns);
  }

  function reveal() {
    const item = queue.shift();
    if (!item) { endButtons(); return; }
    sfx.fanfare();
    confetti(el, 80);
    if (item.type === 'speaker') {
      card.innerHTML = `<div class="reveal"><div class="tag">Nieuwe speaker vrijgespeeld!</div>
        <div class="speaker-wrap big-reveal" style="--charge:1">${speakerSVG(item.s)}</div>
        <h1>${item.s.name}</h1><div class="actions"></div></div>`;
      actions([
        ['🔊 Zet hem aan!', () => { store.get().speaker = item.s.id; store.save(); reveal(); }, 'primary'],
        ['Later', reveal],
      ]);
    } else if (item.type === 'song') {
      card.innerHTML = `<div class="reveal"><div class="tag">Nieuw nummer voor de DJ! 🎧</div>
        <div class="song-icon big-reveal">${item.s.emoji}</div>
        <h1>${item.s.name}</h1><p>${item.s.style}</p><div class="actions"></div></div>`;
      actions([
        ['▶️ Draai het nu!', () => { store.get().song = item.s.id; store.save(); music.play(item.s.id, { mode: 'party' }); reveal(); }, 'primary'],
        ['Later', reveal],
      ]);
    } else if (item.type === 'henry') {
      card.innerHTML = `<div class="reveal"><div class="tag">Nieuwe Henry-vriend!</div>
        <div class="henry-wrap big-reveal">${henrySVG(item.h.color, { mood: 'wow', hat: true })}</div>
        <h1>${item.h.name}</h1><p>${item.h.how} ✔</p><div class="actions"></div></div>`;
      actions([
        [`Neem ${item.h.name} mee!`, () => { store.get().henry = item.h.id; store.save(); reveal(); }, 'primary'],
        ['Later', reveal],
      ]);
    } else {
      card.innerHTML = `<div class="reveal"><div class="tag">Level up! 🚀</div>
        <div class="henry-wrap big-reveal">${henrySVG(hn.color, { mood: 'wow' })}</div>
        <h1>${item.text}</h1><div class="actions"></div></div>`;
      actions([['Wauw! ➜', reveal, 'primary']]);
    }
  }

  timers.push(setTimeout(() => {
    if (queue.length) actions([['Verder ➜', reveal, 'primary']]);
    else endButtons();
  }, big ? 3500 : 1800));

  return {
    el,
    leave() {
      music.stop(0.4);
      timers.forEach(clearTimeout);
    },
  };
}
