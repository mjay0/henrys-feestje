// Het feest na een ronde, plus het onthullen van nieuwe speakers en Henry's.
import { h, tap, go, confetti } from '../ui.js';
import { sfx, startBeat, stopBeat } from '../audio.js';
import { henrySVG, speakerSVG } from '../art.js';
import { activeSpeaker, activeHenry, checkHenrys } from '../rewards.js';
import * as store from '../store.js';

export function partyScreen({ title, lines = [], big = false, newSpeakers = [], messages = [], again = null }) {
  const sp = activeSpeaker();
  const hn = activeHenry();
  const queue = [
    ...newSpeakers.map((s) => ({ type: 'speaker', s })),
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
  const intensity = Math.min(5, sp.tier + 1 + (big ? 1 : 0));
  startBeat(intensity, () => {
    wraps.forEach((w) => { w.classList.remove('thump'); void w.offsetWidth; w.classList.add('thump'); });
    el.classList.toggle('flash');
  });
  timers.push(setTimeout(stopBeat, big ? 45_000 : 20_000));
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
    if (again) btns.push(['🔁 Nog een keer', () => go('play', again), 'primary']);
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
      stopBeat();
      timers.forEach(clearTimeout);
    },
  };
}
