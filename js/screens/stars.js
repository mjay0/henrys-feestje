// "Mijn sterren": wat zit er al goed? Tafelrooster en de plus/min-stappen.
import { h, tap, go } from '../ui.js';
import { mastery, progress, MAX_BOX } from '../engine.js';
import { MODULES } from '../modules/index.js';

const N = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function starsScreen() {
  const cell = (n, t) => {
    const m = mastery(`t${t}x${n}`);
    const cls = !m.seen ? 'unseen' : `b${m.box}`;
    return `<i class="${cls}" title="${n} × ${t}">${n * t}</i>`;
  };
  const allKeys = N.flatMap((t) => N.map((n) => `t${t}x${n}`));
  const gold = allKeys.filter((k) => mastery(k).box >= MAX_BOX).length;

  const pm = MODULES.find((m) => m.id === 'plusmin');
  const tracks = pm.tracks().map(({ track, skills }) => `
    <div class="track"><h4>${track === 'plus' ? '➕ Plus tot 100' : '➖ Min tot 100'}</h4>
      ${skills.map((sk) => {
        const p = progress([sk.key]);
        const done = mastery(sk.key).box >= MAX_BOX;
        return `<div class="step ${sk.open ? '' : 'locked'}">
          <span class="step-name">${sk.open ? '' : '🔒 '}${sk.name} <small>${sk.example}</small></span>
          <span class="progress ${done ? 'gold' : ''}"><i style="width:${p * 100}%"></i></span>
          ${done ? '🏆' : ''}
        </div>`;
      }).join('')}
    </div>`).join('');

  const el = h(`<div>
    <header class="bar">
      <button class="icon-btn back" aria-label="Terug">←</button>
      <h2>⭐ Mijn sterren</h2>
      <span></span>
    </header>
    <div class="stars-page">
      <section>
        <h3>✖️ Tafels <small>${gold}/100 goud</small></h3>
        <div class="grid">
          <b></b>${N.map((n) => `<b>${n}×</b>`).join('')}
          ${N.map((t) => `<b>${t}</b>${N.map((n) => cell(n, t)).join('')}`).join('')}
        </div>
        <div class="legend"><i class="unseen"></i>nog niet gedaan <i class="b0"></i>oefenen <i class="b3"></i>bijna <i class="b5"></i>goud!</div>
      </section>
      <section>${tracks}</section>
    </div>
  </div>`);
  tap(el.querySelector('.back'), () => go('home'));
  return { el };
}
