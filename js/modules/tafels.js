// Tafels 1 t/m 10. Elke som (bijv. 7 × 8) wordt apart bijgehouden.
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

function fact(n, t) {
  return {
    key: key(n, t),
    make: () => ({
      key: key(n, t), text: `${n} × ${t}`, answer: n * t, hint: hint(n, t), near: near(n, t), fastMs: 4000, jump: true,
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
      ...TABLES.map((t) => ({ id: `tafel-${t}`, name: `Tafel van ${t}`, short: `${t}`, items: () => tableItems(t) })),
    ];
  },
  placementTracks: [],
};
