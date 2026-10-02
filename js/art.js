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

// ---------- Meubels voor de Stofzuig-Race (vooraanzicht, zoals Henry) ----------
const FURNITURE = {
  sofa: { vb: '0 0 200 110', svg: `
    <rect x="18" y="12" width="164" height="54" rx="18" fill="#c94a3b"/>
    <rect x="30" y="20" width="66" height="40" rx="12" fill="#e0614f"/><rect x="104" y="20" width="66" height="40" rx="12" fill="#e0614f"/>
    <rect x="10" y="52" width="180" height="40" rx="14" fill="#b63f32"/>
    <rect x="24" y="54" width="74" height="22" rx="8" fill="#d8574a"/><rect x="102" y="54" width="74" height="22" rx="8" fill="#d8574a"/>
    <rect x="2" y="40" width="30" height="54" rx="12" fill="#a8362b"/><rect x="168" y="40" width="30" height="54" rx="12" fill="#a8362b"/>
    <rect x="132" y="28" width="30" height="26" rx="8" fill="#ffd23f" transform="rotate(12 147 41)"/>
    <rect x="18" y="92" width="10" height="14" rx="3" fill="#4a2c1a"/><rect x="172" y="92" width="10" height="14" rx="3" fill="#4a2c1a"/>` },
  plant: { vb: '0 0 80 120', svg: `
    <ellipse cx="40" cy="38" rx="12" ry="30" fill="#2f9e4f" transform="rotate(-28 40 60)"/>
    <ellipse cx="40" cy="38" rx="12" ry="30" fill="#3fb862" transform="rotate(25 40 60)"/>
    <ellipse cx="40" cy="30" rx="11" ry="30" fill="#4fcf72"/>
    <ellipse cx="40" cy="45" rx="10" ry="22" fill="#2a8a45" transform="rotate(-60 40 62)"/>
    <ellipse cx="40" cy="45" rx="10" ry="22" fill="#36a556" transform="rotate(60 40 62)"/>
    <path d="M18 66 L62 66 L56 114 L24 114 Z" fill="#d0703c"/><rect x="14" y="62" width="52" height="10" rx="4" fill="#e0844f"/>` },
  tv: { vb: '0 0 160 120', svg: `
    <rect x="22" y="4" width="116" height="70" rx="8" fill="#1b1b22"/>
    <rect x="28" y="10" width="104" height="58" rx="4" fill="#3b7dd8"/>
    <circle cx="60" cy="40" r="14" fill="#ffd23f"/><path d="M28 68 L64 38 L92 62 L110 48 L132 68 Z" fill="#2fb36b"/>
    <rect x="74" y="74" width="12" height="8" fill="#111"/>
    <rect x="6" y="80" width="148" height="34" rx="6" fill="#9a6a42"/>
    <rect x="14" y="86" width="62" height="22" rx="3" fill="#b07c50"/><rect x="84" y="86" width="62" height="22" rx="3" fill="#b07c50"/>
    <circle cx="70" cy="97" r="3" fill="#5a3a22"/><circle cx="90" cy="97" r="3" fill="#5a3a22"/>` },
  table: { vb: '0 0 180 110', svg: `
    <rect x="34" y="18" width="12" height="70" rx="4" fill="#7a4b2a"/><rect x="134" y="18" width="12" height="70" rx="4" fill="#7a4b2a"/>
    <path d="M60 30 Q60 10 90 10 Q120 10 120 30 Z" fill="#fff" opacity="0.9"/>
    <circle cx="78" cy="24" r="10" fill="#e8413c"/><circle cx="96" cy="22" r="10" fill="#ffb627"/><circle cx="88" cy="16" r="8" fill="#7ac943"/>
    <rect x="8" y="30" width="164" height="16" rx="6" fill="#a8693d"/>
    <rect x="18" y="46" width="12" height="60" rx="4" fill="#8a5530"/><rect x="150" y="46" width="12" height="60" rx="4" fill="#8a5530"/>` },
  fridge: { vb: '0 0 90 160', svg: `
    <rect x="6" y="4" width="78" height="152" rx="12" fill="#e9eef3" stroke="#c4ccd6" stroke-width="3"/>
    <line x1="6" y1="58" x2="84" y2="58" stroke="#c4ccd6" stroke-width="3"/>
    <rect x="66" y="18" width="7" height="28" rx="3" fill="#9aa5b1"/><rect x="66" y="70" width="7" height="40" rx="3" fill="#9aa5b1"/>
    <circle cx="26" cy="80" r="7" fill="#ff5fa2"/><rect x="34" y="94" width="14" height="14" rx="3" fill="#3b7dd8"/>
    <path d="M22 116 l6 -12 l6 12 z" fill="#ffd23f"/><circle cx="30" cy="30" r="6" fill="#2fb36b"/>` },
  bed: { vb: '0 0 200 120', svg: `
    <rect x="4" y="6" width="22" height="104" rx="8" fill="#3b5bb8"/><rect x="174" y="40" width="22" height="70" rx="8" fill="#3b5bb8"/>
    <rect x="16" y="56" width="170" height="30" rx="10" fill="#f3f0ea"/>
    <rect x="30" y="40" width="46" height="24" rx="12" fill="#ffffff" stroke="#ddd" stroke-width="2"/>
    <path d="M70 52 L186 52 L186 92 L64 92 Q58 72 70 52 Z" fill="#ff8a3d"/>
    <circle cx="100" cy="70" r="6" fill="#ffd23f"/><circle cx="130" cy="64" r="6" fill="#ffd23f"/><circle cx="160" cy="76" r="6" fill="#ffd23f"/>
    <circle cx="44" cy="34" r="10" fill="#b5835a"/><circle cx="37" cy="26" r="5" fill="#b5835a"/><circle cx="51" cy="26" r="5" fill="#b5835a"/>
    <circle cx="44" cy="46" r="12" fill="#b5835a"/><circle cx="41" cy="32" r="1.8" fill="#222"/><circle cx="47" cy="32" r="1.8" fill="#222"/>
    <rect x="12" y="86" width="178" height="16" rx="6" fill="#2d4790"/>` },
  toybox: { vb: '0 0 110 100', svg: `
    <circle cx="30" cy="30" r="16" fill="#e8413c"/><path d="M14 30 Q30 22 46 30" stroke="#fff" stroke-width="4" fill="none"/>
    <rect x="58" y="10" width="26" height="26" rx="4" fill="#3b7dd8" transform="rotate(14 71 23)"/>
    <text x="71" y="30" font-size="16" font-weight="900" text-anchor="middle" fill="#fff" transform="rotate(14 71 23)">7</text>
    <rect x="6" y="36" width="98" height="60" rx="8" fill="#2fb36b"/>
    <rect x="2" y="32" width="106" height="14" rx="6" fill="#26934f"/>
    <circle cx="55" cy="70" r="12" fill="#ffd23f"/><text x="55" y="76" font-size="16" font-weight="900" text-anchor="middle" fill="#26934f">+</text>` },
  djbooth: { vb: '0 0 220 110', svg: `
    <rect x="8" y="36" width="204" height="70" rx="10" fill="#1b1b22" stroke="#33333c" stroke-width="3"/>
    <rect x="18" y="26" width="184" height="16" rx="5" fill="#2a2a33"/>
    <circle cx="60" cy="28" r="20" fill="#111" stroke="#444" stroke-width="3"/><circle cx="60" cy="28" r="5" fill="#ff2bd6"/>
    <circle cx="160" cy="28" r="20" fill="#111" stroke="#444" stroke-width="3"/><circle cx="160" cy="28" r="5" fill="#00d0ff"/>
    <rect x="96" y="14" width="28" height="20" rx="3" fill="#444"/><rect x="100" y="18" width="20" height="12" fill="#2bff88"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${24 + i * 23}" y="60" width="16" height="30" rx="4" fill="#ff2bd6"><animate attributeName="fill" values="${LIGHT_CYCLE}" dur="1.6s" begin="-${i * 0.2}s" repeatCount="indefinite"/></rect>`).join('')}` },
};

export function furnitureSVG(kind) {
  const f = FURNITURE[kind];
  return `<svg class="furniture" viewBox="${f.vb}" xmlns="http://www.w3.org/2000/svg">${f.svg}</svg>`;
}

// James, de ragdoll-kat (zijaanzicht): crème vacht, donkere oren/snoet/staart, blauwe ogen.
export function catSVG() {
  const point = '#6e4b3a';
  return `<svg class="cat" viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg" aria-label="James de kat">
  <ellipse cx="85" cy="114" rx="60" ry="5" fill="#000" opacity="0.25"/>
  <g class="tail"><path d="M28 62 C0 50 2 18 22 12" stroke="${point}" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M28 62 C6 52 6 24 22 14" stroke="#8a6250" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.6"/></g>
  <g class="leg l1"><rect x="38" y="70" width="15" height="40" rx="7" fill="#e8dcc6"/><ellipse cx="45" cy="110" rx="10" ry="5" fill="#fff"/></g>
  <g class="leg l2"><rect x="108" y="70" width="15" height="40" rx="7" fill="#e8dcc6"/><ellipse cx="115" cy="110" rx="10" ry="5" fill="#fff"/></g>
  <ellipse cx="78" cy="64" rx="56" ry="28" fill="#f6efe2"/>
  <ellipse cx="96" cy="74" rx="26" ry="16" fill="#fffdf8"/>
  <g class="leg l3"><rect x="52" y="72" width="15" height="40" rx="7" fill="#f3ead8"/><ellipse cx="59" cy="112" rx="10" ry="5" fill="#fff"/></g>
  <g class="leg l4"><rect x="94" y="72" width="15" height="40" rx="7" fill="#f3ead8"/><ellipse cx="101" cy="112" rx="10" ry="5" fill="#fff"/></g>
  <g class="head">
    <path d="M116 22 L122 2 L134 18 Z" fill="${point}"/><path d="M146 18 L158 2 L162 24 Z" fill="${point}"/>
    <path d="M120 18 L124 8 L131 17 Z" fill="#e7a7a0"/><path d="M149 17 L156 8 L158 20 Z" fill="#e7a7a0"/>
    <ellipse cx="140" cy="40" rx="30" ry="26" fill="#f6efe2"/>
    <ellipse cx="141" cy="46" rx="20" ry="17" fill="${point}" opacity="0.85"/>
    <ellipse cx="131" cy="38" rx="6" ry="7" fill="#5bb8ff"/><ellipse cx="151" cy="38" rx="6" ry="7" fill="#5bb8ff"/>
    <ellipse cx="132" cy="39" rx="2.5" ry="5" fill="#111"/><ellipse cx="152" cy="39" rx="2.5" ry="5" fill="#111"/>
    <circle cx="133" cy="36" r="1.6" fill="#fff"/><circle cx="153" cy="36" r="1.6" fill="#fff"/>
    <path d="M138 48 L144 48 L141 52 Z" fill="#e7a7a0"/>
    <path d="M141 52 Q137 57 133 54 M141 52 Q145 57 149 54" stroke="#3a2a22" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M124 50 L104 46 M124 54 L104 56 M158 50 L176 46 M158 54 L176 56" stroke="#fff" stroke-width="1.5" opacity="0.8"/>
  </g>
</svg>`;
}
