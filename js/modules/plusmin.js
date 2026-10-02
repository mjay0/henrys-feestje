// Plus en min tot 100, opgebouwd in stappen (somtypes). Een nieuwe stap gaat
// open zodra de vorige goed zit. Per somtype wordt de beheersing bijgehouden.
import * as store from '../store.js';
import { mastery, rand } from '../engine.js';

const FAST_EASY = 6000;
const FAST_BRIDGE = 9000;

function plusHint(a, b) {
  const steps = [];
  let cur = a;
  const tens = b - (b % 10);
  const units = b % 10;
  if (tens) { steps.push(`${cur} + ${tens} = ${cur + tens}`); cur += tens; }
  if (units) {
    const toTen = 10 - (cur % 10);
    if (cur % 10 !== 0 && units > toTen) {
      steps.push(`${cur} + ${toTen} = ${cur + toTen}`);
      cur += toTen;
      steps.push(`${cur} + ${units - toTen} = ${cur + units - toTen}`);
    } else {
      steps.push(`${cur} + ${units} = ${cur + units}`);
    }
  }
  return steps;
}

function minHint(a, b) {
  const steps = [];
  let cur = a;
  const tens = b - (b % 10);
  const units = b % 10;
  if (tens) { steps.push(`${cur} − ${tens} = ${cur - tens}`); cur -= tens; }
  if (units) {
    const down = cur % 10;
    if (down !== 0 && units > down) {
      steps.push(`${cur} − ${down} = ${cur - down}`);
      cur -= down;
      steps.push(`${cur} − ${units - down} = ${cur - units + down}`);
    } else {
      steps.push(`${cur} − ${units} = ${cur - units}`);
    }
  }
  return steps;
}

// Foute antwoorden die op echte denkfouten lijken (voor de Stofzuig-Race).
function near(ans, typical) {
  const flip = Number(String(ans).split('').reverse().join(''));
  return [...typical, ans + 10, ans - 10, ans + 1, ans - 1, ans + 2, ans - 2, flip]
    .filter((x) => x >= 0 && x <= 100 && x !== ans);
}

function plusNear(a, b) {
  const s = a + b;
  // Vergeten over het tiental te gaan: 38 + 7 = 35
  const noCarry = (a % 10) + (b % 10) >= 10 ? s - 10 : s + 10;
  return near(s, [noCarry]);
}

function minNear(a, b) {
  const s = a - b;
  // Kleinste van grootste: 42 − 7 → 2 en 7 omdraaien = 45
  const swap = (Math.floor(a / 10) - Math.floor(b / 10)) * 10 + Math.abs((a % 10) - (b % 10));
  return near(s, [swap, s + 10]);
}

const plus = (a, b) => ({ text: `${a} + ${b}`, answer: a + b, hint: plusHint(a, b), near: plusNear(a, b) });
const min = (a, b) => ({ text: `${a} − ${b}`, answer: a - b, hint: minHint(a, b), near: minNear(a, b) });

// Elk somtype levert een willekeurige som van dat type.
export const SKILLS = {
  plus: [
    { id: 'p1', name: 'Plus eenheden', example: '34 + 5', fast: FAST_EASY,
      gen() { const ua = rand(1, 8); return plus(rand(1, 8) * 10 + ua, rand(1, 9 - ua)); } },
    { id: 'p2', name: 'Plus tientallen', example: '34 + 20', fast: FAST_EASY,
      gen() { const ta = rand(1, 8); return plus(ta * 10 + rand(1, 9), rand(1, 9 - ta) * 10); } },
    { id: 'p3', name: 'Plus tot 100', example: '34 + 25', fast: FAST_EASY,
      gen() {
        const ta = rand(1, 7), ua = rand(1, 8);
        return plus(ta * 10 + ua, rand(1, 8 - ta) * 10 + rand(1, 9 - ua));
      } },
    { id: 'p4', name: 'Plus over het tiental', example: '38 + 7', fast: FAST_BRIDGE,
      gen() { const ua = rand(2, 9); return plus(rand(1, 8) * 10 + ua, rand(10 - ua, 9)); } },
    { id: 'p5', name: 'Plus over het tiental (groot)', example: '47 + 28', fast: FAST_BRIDGE,
      gen() {
        const ta = rand(1, 7), ua = rand(2, 9);
        return plus(ta * 10 + ua, rand(1, 8 - ta) * 10 + rand(10 - ua, 9));
      } },
  ],
  min: [
    { id: 'm1', name: 'Min eenheden', example: '45 − 3', fast: FAST_EASY,
      gen() { const ua = rand(1, 9); return min(rand(1, 9) * 10 + ua, rand(1, ua)); } },
    { id: 'm2', name: 'Min tientallen', example: '45 − 20', fast: FAST_EASY,
      gen() { const ta = rand(2, 9); return min(ta * 10 + rand(1, 9), rand(1, ta - 1) * 10); } },
    { id: 'm3', name: 'Min tot 100', example: '45 − 23', fast: FAST_EASY,
      gen() {
        const ta = rand(2, 9), ua = rand(1, 9);
        return min(ta * 10 + ua, rand(1, ta - 1) * 10 + rand(1, ua));
      } },
    { id: 'm4', name: 'Min over het tiental', example: '42 − 7', fast: FAST_BRIDGE,
      gen() { const ua = rand(0, 8); return min(rand(1, 9) * 10 + ua, rand(ua + 1, 9)); } },
    { id: 'm5', name: 'Min over het tiental (groot)', example: '63 − 28', fast: FAST_BRIDGE,
      gen() {
        const ta = rand(3, 9), ua = rand(0, 8);
        return min(ta * 10 + ua, rand(1, ta - 2) * 10 + rand(ua + 1, 9));
      } },
  ],
};

const skillKey = (s) => `pm-${s.id}`;

const unlocked = (track) => store.get().unlockedSkills[track] || 1;

function items(track) {
  return SKILLS[track].slice(0, unlocked(track)).map((s) => ({
    key: skillKey(s),
    make: () => ({ key: skillKey(s), fastMs: s.fast, ...s.gen() }),
  }));
}

export default {
  id: 'plusmin',
  name: 'Plus en min',
  emoji: '➕',
  pools() {
    return [
      { id: 'plus', name: 'Plus tot 100', sub: `stap ${unlocked('plus')} van ${SKILLS.plus.length}`, items: () => items('plus') },
      { id: 'min', name: 'Min tot 100', sub: `stap ${unlocked('min')} van ${SKILLS.min.length}`, items: () => items('min') },
      { id: 'plusmin', name: 'Plus en min', sub: 'door elkaar', items: () => [...items('plus'), ...items('min')] },
    ];
  },
  // Overzicht van alle stappen per spoor, voor het "Mijn sterren" scherm.
  tracks() {
    return Object.entries(SKILLS).map(([track, skills]) => ({
      track,
      skills: skills.map((s, i) => ({ ...s, key: skillKey(s), open: i < unlocked(track) })),
    }));
  },
  // Na elk antwoord: gaat er een nieuwe stap open?
  afterRecord(key) {
    for (const [track, skills] of Object.entries(SKILLS)) {
      const n = unlocked(track);
      const last = skills[n - 1];
      if (skillKey(last) === key && n < skills.length && mastery(key).box >= 4) {
        store.get().unlockedSkills[track] = n + 1;
        return `Nieuwe stap: ${skills[n].name} (${skills[n].example})`;
      }
    }
    return null;
  },
  placementTracks: Object.entries(SKILLS).map(([track, skills]) => ({
    track,
    skills: skills.map((s) => ({ key: skillKey(s), make: () => ({ key: skillKey(s), fastMs: s.fast, ...s.gen() }) })),
  })),
};
