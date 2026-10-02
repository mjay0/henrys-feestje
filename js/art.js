// Getekende figuren (SVG): Henry en de speakers. Geen logo's, eigen tekening.

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

let uid = 0;

// mood: happy | sad | wow ; hat: feesthoedje op of niet
export function henrySVG(color = '#d7262e', { mood = 'happy', hat = false } = {}) {
  const id = `h${uid++}`;
  const dark = shade(color, -0.35);
  const light = shade(color, 0.3);
  const mouth = {
    happy: '<path d="M78 150 Q110 180 142 150" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/>',
    wow: '<ellipse cx="110" cy="160" rx="12" ry="14" fill="#1a1a1a"/><ellipse cx="110" cy="165" rx="7" ry="6" fill="#e0576b"/>',
    sad: '<path d="M85 165 Q110 150 135 165" stroke="#1a1a1a" stroke-width="7" fill="none" stroke-linecap="round"/>',
  }[mood];
  const brow = mood === 'sad'
    ? '<path d="M70 104 L94 95 M150 104 L126 95" stroke="#1a1a1a" stroke-width="5" stroke-linecap="round"/>'
    : '';
  return `<svg class="henry" viewBox="0 -22 240 252" xmlns="http://www.w3.org/2000/svg" aria-label="Henry">
  <defs>
    <linearGradient id="${id}b" x1="0" x2="1">
      <stop offset="0" stop-color="${dark}"/><stop offset="0.35" stop-color="${color}"/>
      <stop offset="0.6" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="${id}l" x1="0" x2="1">
      <stop offset="0" stop-color="#111"/><stop offset="0.5" stop-color="#444"/><stop offset="1" stop-color="#111"/>
    </linearGradient>
  </defs>
  <ellipse cx="110" cy="218" rx="80" ry="8" fill="#000" opacity="0.25"/>
  <!-- slang -->
  <path class="hose" d="M140 132 C185 132 200 165 212 120 C222 82 200 60 222 30" stroke="#333" stroke-width="16" fill="none" stroke-linecap="round"/>
  <path d="M140 132 C185 132 200 165 212 120 C222 82 200 60 222 30" stroke="#555" stroke-width="16" fill="none" stroke-dasharray="3 7" stroke-linecap="round"/>
  <!-- ketel -->
  <path d="M30 80 L190 80 L182 196 Q110 214 38 196 Z" fill="url(#${id}b)"/>
  <rect x="34" y="190" width="152" height="18" rx="9" fill="#1d1d1d"/>
  <!-- hoed / deksel -->
  <ellipse cx="110" cy="80" rx="88" ry="16" fill="url(#${id}l)"/>
  <path d="M42 78 Q44 40 110 38 Q176 40 178 78 Z" fill="url(#${id}l)"/>
  <rect x="88" y="22" width="44" height="22" rx="10" fill="#222"/>
  ${hat ? `<path d="M90 30 L110 -12 L130 30 Z" fill="#ffd23f"/><circle cx="110" cy="-12" r="7" fill="#ff5fa2"/>
  <path d="M96 22 L124 22" stroke="#ff5fa2" stroke-width="4"/>` : ''}
  <!-- gezicht -->
  <ellipse cx="80" cy="112" rx="13" ry="15" fill="#fff"/>
  <ellipse cx="140" cy="112" rx="13" ry="15" fill="#fff"/>
  <g class="pupils"><circle cx="83" cy="115" r="7" fill="#1a1a1a"/><circle cx="143" cy="115" r="7" fill="#1a1a1a"/>
  <circle cx="85" cy="112" r="2.5" fill="#fff"/><circle cx="145" cy="112" r="2.5" fill="#fff"/></g>
  ${brow}
  <circle cx="110" cy="134" r="12" fill="#1a1a1a"/><circle cx="110" cy="134" r="6" fill="#444"/>
  ${mouth}
</svg>`;
}

// Lichtkleuren die rondlopen (SMIL-animatie, werkt in Safari).
const LIGHT_CYCLE = '#ff2bd6;#7b2bff;#00d0ff;#2bff88;#ffd400;#ff6a00;#ff2bd6';

function woofer(cx, cy, r, s, i) {
  const anim = `<animate attributeName="stroke" values="${LIGHT_CYCLE}" dur="${3 + i}s" repeatCount="indefinite"/>`;
  let ring = `<circle class="lights" cx="${cx}" cy="${cy}" r="${r + 7}" fill="none" stroke="#ff2bd6" stroke-width="6">${anim}</circle>`;
  if (s.lights !== 'ring') {
    ring += `<circle class="lights" cx="${cx}" cy="${cy}" r="${r + 15}" fill="none" stroke="#00d0ff" stroke-width="3" stroke-dasharray="6 6">
      <animate attributeName="stroke" values="${LIGHT_CYCLE}" dur="${2 + i}s" begin="-1s" repeatCount="indefinite"/>
      <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="6s" repeatCount="indefinite"/></circle>`;
  }
  return `${ring}
  <g class="cone">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#121216" stroke="#2c2c34" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="#1b1b22"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="#2a2a33"/>
    <circle cx="${cx - r * 0.1}" cy="${cy - r * 0.1}" r="${r * 0.1}" fill="#555" opacity="0.6"/>
  </g>`;
}

export function speakerSVG(s) {
  const id = `s${uid++}`;
  const tower = s.shape === 'tower';
  const W = tower ? (s.big ? 220 : 190) : 200;
  const H = tower ? (s.big ? 360 : 320) : s.tall ? 250 : 210;
  const bodyX = 10, bodyY = 30, bw = W - 20, bh = H - (s.wheels ? 60 : 45);
  let woofers = '';
  if (s.woofers === 2) {
    const r = bw * 0.3;
    woofers += woofer(W / 2, bodyY + bh * 0.3, r, s, 0) + woofer(W / 2, bodyY + bh * 0.73, r, s, 1);
  } else {
    woofers += woofer(W / 2, bodyY + bh * 0.55, bw * 0.3, s, 0);
  }
  const strobes = s.lights === 'panel'
    ? `<rect class="lights" x="${bodyX + 6}" y="${bodyY + 8}" width="8" height="${bh - 16}" rx="4" fill="#ff2bd6"><animate attributeName="fill" values="${LIGHT_CYCLE}" dur="2.5s" repeatCount="indefinite"/></rect>
       <rect class="lights" x="${bodyX + bw - 14}" y="${bodyY + 8}" width="8" height="${bh - 16}" rx="4" fill="#00d0ff"><animate attributeName="fill" values="${LIGHT_CYCLE}" dur="2.5s" begin="-1.2s" repeatCount="indefinite"/></rect>`
    : '';
  const tweeter = s.woofers === 1
    ? `<rect x="${W / 2 - 34}" y="${bodyY + 14}" width="68" height="16" rx="8" fill="#1b1b22" stroke="#33333c" stroke-width="2"/>`
    : '';
  const handle = tower
    ? `<rect x="${W / 2 - 40}" y="6" width="80" height="34" rx="14" fill="none" stroke="#24242c" stroke-width="12"/>`
    : s.strap
      ? `<path d="M30 40 Q${W / 2} -20 ${W - 30} 40" stroke="#3a3a44" stroke-width="10" fill="none"/>`
      : `<rect x="${W / 2 - 45}" y="10" width="90" height="30" rx="12" fill="none" stroke="#24242c" stroke-width="12"/>`;
  const wheels = s.wheels
    ? `<circle cx="${bodyX + 26}" cy="${H - 22}" r="16" fill="#111" stroke="#333" stroke-width="4"/>
       <circle cx="${bodyX + bw - 26}" cy="${H - 22}" r="16" fill="#111" stroke="#333" stroke-width="4"/>`
    : `<rect x="${bodyX + 16}" y="${bodyY + bh - 4}" width="24" height="12" rx="4" fill="#111"/>
       <rect x="${bodyX + bw - 40}" y="${bodyY + bh - 4}" width="24" height="12" rx="4" fill="#111"/>`;
  const pads = s.pads
    ? `<rect x="${bodyX + 20}" y="${bodyY + 6}" width="${bw - 40}" height="10" rx="3" fill="#2a2a33"/>
       ${[0, 1, 2, 3, 4, 5].map((i) => `<rect class="lights" x="${bodyX + 26 + i * ((bw - 52) / 6)}" y="${bodyY + 8}" width="${(bw - 52) / 6 - 4}" height="6" rx="2" fill="#ffd400"><animate attributeName="fill" values="${LIGHT_CYCLE}" dur="1.5s" begin="-${i * 0.25}s" repeatCount="indefinite"/></rect>`).join('')}`
    : '';
  return `<svg class="speaker" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-label="${s.name}">
  <defs><linearGradient id="${id}g" x1="0" x2="1">
    <stop offset="0" stop-color="#0d0d11"/><stop offset="0.5" stop-color="#26262e"/><stop offset="1" stop-color="#0d0d11"/>
  </linearGradient></defs>
  <ellipse cx="${W / 2}" cy="${H - 4}" rx="${W * 0.45}" ry="6" fill="#000" opacity="0.35"/>
  ${handle}
  <rect x="${bodyX}" y="${bodyY}" width="${bw}" height="${bh}" rx="${tower ? 26 : 34}" fill="url(#${id}g)" stroke="#33333c" stroke-width="3"/>
  ${strobes}${pads}${tweeter}${woofers}
  <rect x="${W / 2 - 18}" y="${bodyY + bh - 18}" width="36" height="9" rx="4.5" fill="#ff6a00"/>
  ${wheels}
</svg>`;
}
