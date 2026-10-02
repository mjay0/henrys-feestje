// Kleine UI-hulpjes en de schermwisselaar.
import { sfx } from './audio.js';

const app = document.getElementById('app');
const screens = {};
let cleanup = null;

export function register(name, fn) { screens[name] = fn; }

// Wissel van scherm. Een scherm geeft { el, leave? } terug.
export function go(name, args = {}) {
  if (cleanup) { try { cleanup(); } catch {} }
  cleanup = null;
  const res = screens[name](args);
  cleanup = res.leave || null;
  res.el.classList.add('screen', `screen-${name}`);
  app.replaceChildren(res.el);
  window.scrollTo(0, 0);
}

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Koppel een tik-handler (werkt snel op touch, zonder dubbeltik-zoom).
export function tap(el, fn, { sound = true } = {}) {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    if (sound) sfx.tap();
    fn(e);
  });
}

export function numpad(onKey) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
  const el = h(`<div class="numpad">${keys.map((k) =>
    `<button class="key key-${k}" data-k="${k}">${k === 'del' ? '⌫' : k === 'ok' ? '✔' : k}</button>`).join('')}</div>`);
  el.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();
    b.classList.add('down');
    setTimeout(() => b.classList.remove('down'), 120);
    onKey(b.dataset.k);
  });
  return el;
}

// Ook het toetsenbord (handig op laptop of met iPad-toetsenbord).
export function keyboard(onKey) {
  const fn = (e) => {
    if (/^[0-9]$/.test(e.key)) onKey(e.key);
    else if (e.key === 'Backspace') onKey('del');
    else if (e.key === 'Enter') onKey('ok');
  };
  window.addEventListener('keydown', fn);
  return () => window.removeEventListener('keydown', fn);
}

export function confetti(container, n = 60) {
  const colors = ['#ff2bd6', '#7b2bff', '#00d0ff', '#2bff88', '#ffd400', '#ff6a00'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.8}s`;
    c.style.animationDuration = `${2 + Math.random() * 2}s`;
    c.style.setProperty('--drift', `${(Math.random() - 0.5) * 200}px`);
    container.appendChild(c);
    setTimeout(() => c.remove(), 5000);
  }
}

export function floatText(container, text, cls = '') {
  const f = h(`<div class="float ${cls}">${text}</div>`);
  container.appendChild(f);
  setTimeout(() => f.remove(), 1200);
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const fmt = (n) => n.toLocaleString('nl-NL');
