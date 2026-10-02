// Tafels 1 t/m 10. Elke som (bijv. 7 × 8) wordt apart bijgehouden.
import * as store from '../store.js';
import { progress } from '../engine.js';

const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const BONUS_FROM = [2, 3, 4, 5, 6, 7, 8, 9]; // de tafels van 1 en 10 zijn nooit bonus

const key = (n, t) => `t${t}x${n}`;

function hint(n, t) {
  if (n === 1) return [`1 × ${t} is gewoon ${t}`];
  if (n === 10) return [`10 × ${t}: zet een 0 achter de ${t}`, `= ${10 * t}`];
  if (n === 2) return [`2 × ${t} is het dubbele van ${t}`, `${t} + ${t} = ${2 * t}`];
  if (n <= 5) return [`${n - 1} × ${t} = ${(n - 1) * t}`, `${(n - 1) * t} + ${t} = ${n * t}`];
  return [
    `5 × ${t} = ${5 * t}`,
    `${n - 5} × ${t} = ${(n - 5) * t}`,
    `${5 * t} + ${(n - 5) * t} = ${n * t}`,
  ];
}

// Foute antwoorden waar kinderen echt mee in de war raken (voor de Stofzuig-Race).
function near(n, t) {
  const a = n * t;
  const flip = Number(String(a).split('').reverse().join(''));
  return [(n + 1) * t, (n - 1) * t, n * (t + 1), n * (t - 1), a + 10, a - 10, a + 1, a - 1, flip]
    .filter((x) => x > 0 && x !== a);
}

// Moeilijkheid: ×1 en ×10 zijn makkies (komen weinig voor, weinig watts),
// 6 t/m 9 keer 6 t/m 9 zijn pittig (komen vaak voor, veel watts).
function level(n, t) {
  if (n === 1 || n === 10 || t === 1 || t === 10) return { weight: 0.25, value: 4 };
  if (n === 2 || n === 5 || t === 2 || t === 5) return { weight: 0.7, value: 8 };
  if (n >= 6 && t >= 6) return { weight: 1.5, value: 14 };
  return { weight: 1, value: 10 };
}

// Bonustafel van de dag: de zwakste tafel van 2 t/m 9 krijgt dubbele watts.
// Wordt per dag vastgezet, zodat hij niet halverwege wisselt.
export function bonusTable() {
  const s = store.get();
  const day = store.today();
  if (s.bonus && s.bonus.day === day && BONUS_FROM.includes(s.bonus.table)) return s.bonus.table;
  const score = (t) => progress(TABLES.map((n) => key(n, t)));
  const lowest = Math.min(...BONUS_FROM.map(score));
  const weakest = BONUS_FROM.filter((t) => score(t) <= lowest + 0.05);
  // niet twee dagen achter elkaar dezelfde, als het kan
  const pool = weakest.length > 1 ? weakest.filter((t) => t !== s.bonus?.table) : weakest;
  const table = pool[Math.floor(Math.random() * pool.length)];
  s.bonus = { day, table };
  store.save();
  return table;
}

function fact(n, t) {
  const lv = level(n, t);
  const bonus = t === bonusTable() || n === bonusTable();
  return {
    key: key(n, t),
    weight: lv.weight * (bonus ? 1.5 : 1),
    make: () => ({
      key: key(n, t), text: `${n} × ${t}`, answer: n * t, hint: hint(n, t), near: near(n, t),
      fastMs: 4000, jump: true, value: lv.value, bonus,
    }),
  };
}

const tableItems = (t) => TABLES.map((n) => fact(n, t));

export default {
  id: 'tafels',
  name: 'Tafels',
  emoji: '✖️',
  pools() {
    return [
      { id: 'tafels-mix', name: 'Alle tafels', sub: 'door elkaar', big: true, items: () => TABLES.flatMap(tableItems) },
      ...TABLES.map((t) => ({
        id: `tafel-${t}`, name: `Tafel van ${t}`, short: `${t}`, items: () => tableItems(t),
        tag: t === bonusTable() ? '⚡×2 vandaag' : t === 1 || t === 10 ? 'makkie' : '',
      })),
    ];
  },
  placementTracks: [],
};
