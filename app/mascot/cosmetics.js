/*!
 * Convo mascot cosmetics: hats, glasses and neckwear drawn in the mascot's own coordinates
 * (viewBox -100 -180 200 200; head top at y -131, eyes at x ±16, y -83, face bottom at y -54).
 *
 * Each item is plain SVG markup with no ids or gradients, so any number can sit on a page.
 * Slots: 'hat' (drawn over the head), 'glasses' (drawn on the face, so they follow its turn
 * and tilt), 'neck' (drawn over the body below the face) and 'hand' (held at the side, in front).
 */

const INK = '#1A1A1A';

export const SLOTS = ['hat', 'glasses', 'neck', 'hand'];
export const SLOT_LABEL = { hat: 'Hats', glasses: 'Glasses', neck: 'Neckwear', hand: 'Held' };

const frame = (cx, shape, color = INK, w = 3) => `<g transform="translate(${cx} -83)" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round">${shape}</g>`;
const bridge = (color = INK, w = 3) => `<path d="M-5 -85 Q0 -89 5 -85" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const arms = (color = INK) => `<path d="M-31 -86 L-39 -90 M31 -86 L39 -90" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
const HEART = 'M0 9 C-3 6 -13 0 -13 -6 C-13 -11 -9 -13 -6.5 -13 C-3.5 -13 -1 -11 0 -9 C1 -11 3.5 -13 6.5 -13 C9 -13 13 -11 13 -6 C13 0 3 6 0 9 Z';

function star(R, r, n = 5) {
  let d = '';
  for (let i = 0; i < n * 2; i += 1) {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rad = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)} `;
  }
  return `${d}Z`;
}

export const COSMETICS = [
  /* ---------------- Hats ---------------- */
  {
    id: 'beanie', slot: 'hat', name: 'Red beanie',
    svg: `<path d="M-44 -106 C-46 -142 46 -142 44 -106 Z" fill="#E5484D"/>
      <path d="M-30 -126 L-28 -108 M-12 -134 L-11 -108 M8 -134 L8 -108 M26 -126 L24 -108" stroke="#C1363B" stroke-width="3" stroke-linecap="round" fill="none"/>
      <rect x="-47" y="-114" width="94" height="13" rx="6.5" fill="#F0696D"/>
      <circle cx="0" cy="-142" r="9" fill="#FFF4F0"/><circle cx="-2.5" cy="-144.5" r="3" fill="#fff"/>`,
  },
  {
    id: 'cap', slot: 'hat', name: 'Blue cap',
    svg: `<path d="M-42 -108 C-44 -142 42 -142 42 -108 Z" fill="#3E7BEA"/>
      <path d="M0 -136 L0 -110" stroke="#2F63C4" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M8 -110 C28 -118 52 -114 58 -104 C42 -102 22 -102 8 -105 Z" fill="#2F63C4"/>
      <circle cx="0" cy="-137" r="3.6" fill="#2F63C4"/>`,
  },
  {
    id: 'party', slot: 'hat', name: 'Party hat',
    svg: `<g transform="rotate(-9 0 -112)">
      <path d="M-24 -112 L0 -172 L24 -112 Z" fill="#7C5CF5"/>
      <path d="M-15 -134 L11 -128 M-20 -122 L18 -116" stroke="#FFD83D" stroke-width="4" stroke-linecap="round"/>
      <circle cx="-8" cy="-148" r="2.6" fill="#FFD83D"/><circle cx="6" cy="-139" r="2.6" fill="#F0D7FF"/>
      <ellipse cx="0" cy="-112" rx="26" ry="4.5" fill="#6246D6"/>
      <circle cx="0" cy="-174" r="7" fill="#FFD83D"/></g>`,
  },
  {
    id: 'crown', slot: 'hat', name: 'Gold crown',
    svg: `<path d="M-32 -110 L-37 -146 L-18 -128 L0 -152 L18 -128 L37 -146 L32 -110 Z" fill="#FFC21A" stroke="#E9A300" stroke-width="2" stroke-linejoin="round"/>
      <rect x="-32" y="-117" width="64" height="7" fill="#E9A300"/>
      <circle cx="0" cy="-129" r="4" fill="#E5484D"/><circle cx="-18" cy="-123" r="3" fill="#3E7BEA"/><circle cx="18" cy="-123" r="3" fill="#2EB67D"/>
      <circle cx="-37" cy="-147" r="3.4" fill="#FFEC8A"/><circle cx="0" cy="-153" r="3.4" fill="#FFEC8A"/><circle cx="37" cy="-147" r="3.4" fill="#FFEC8A"/>`,
  },
  {
    id: 'chef', slot: 'hat', name: 'Chef hat',
    svg: `<circle cx="-24" cy="-136" r="17" fill="#fff"/><circle cx="24" cy="-136" r="17" fill="#fff"/><circle cx="0" cy="-146" r="20" fill="#fff"/>
      <path d="M-34 -138 Q-24 -126 -14 -136 M14 -138 Q24 -126 34 -136" stroke="#E7E4D8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="-33" y="-128" width="66" height="22" rx="4" fill="#fff"/>
      <rect x="-33" y="-113" width="66" height="7" fill="#EDEADC"/>`,
  },
  {
    id: 'flower', slot: 'hat', name: 'Flower',
    svg: `<g transform="translate(-30 -116) rotate(-15)">
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-8" rx="6" ry="8.5" fill="#FF8FB8" transform="rotate(${a})"/>`).join('')}
      <circle r="5.6" fill="#FFD83D"/></g>`,
  },

  /* ---------------- Glasses ---------------- */
  {
    id: 'round', slot: 'glasses', name: 'Round glasses',
    svg: `${frame(-16, '<circle r="12.5"/>')}${frame(16, '<circle r="12.5"/>')}${bridge()}${arms()}
      <circle cx="-16" cy="-83" r="12" fill="#fff" opacity=".12"/><circle cx="16" cy="-83" r="12" fill="#fff" opacity=".12"/>`,
  },
  {
    id: 'square', slot: 'glasses', name: 'Square frames',
    svg: `${frame(-16, '<rect x="-12" y="-10" width="24" height="20" rx="5"/>', '#7C5CF5', 3.4)}${frame(16, '<rect x="-12" y="-10" width="24" height="20" rx="5"/>', '#7C5CF5', 3.4)}${bridge('#7C5CF5', 3.4)}${arms('#7C5CF5')}
      <rect x="-28" y="-93" width="24" height="20" rx="5" fill="#fff" opacity=".12"/><rect x="4" y="-93" width="24" height="20" rx="5" fill="#fff" opacity=".12"/>`,
  },
  {
    id: 'shades', slot: 'glasses', name: 'Sunglasses',
    svg: `<path d="M-31 -93 L-3 -93 L-5 -77 C-7 -72 -12 -71 -17 -71 C-24 -71 -29 -74 -30 -81 Z" fill="#14141C"/>
      <path d="M31 -93 L3 -93 L5 -77 C7 -72 12 -71 17 -71 C24 -71 29 -74 30 -81 Z" fill="#14141C"/>
      <path d="M-4 -90 L4 -90" stroke="#14141C" stroke-width="3.4" stroke-linecap="round"/>
      <path d="M-31 -91 L-39 -94 M31 -91 L39 -94" stroke="#14141C" stroke-width="3" stroke-linecap="round"/>
      <path d="M-26 -89 L-18 -89 M8 -89 L16 -89" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".35"/>`,
  },
  {
    id: 'heart', slot: 'glasses', name: 'Heart shades',
    svg: `<g transform="translate(-16 -83) scale(1.18)" fill="#F04E8C" stroke="#C93272" stroke-width="1.6" stroke-linejoin="round"><path d="${HEART}"/></g>
      <g transform="translate(16 -83) scale(1.18)" fill="#F04E8C" stroke="#C93272" stroke-width="1.6" stroke-linejoin="round"><path d="${HEART}"/></g>
      <path d="M-3 -88 Q0 -91 3 -88" stroke="#C93272" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M-31 -90 L-39 -94 M31 -90 L39 -94" stroke="#C93272" stroke-width="3" stroke-linecap="round"/>
      <path d="M-24 -90 L-20 -93 M8 -90 L12 -93" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`,
  },
  {
    id: 'star', slot: 'glasses', name: 'Star shades',
    svg: `<g transform="translate(-16 -83) scale(1.25)" fill="#FFC21A" stroke="#E9A300" stroke-width="1.5" stroke-linejoin="round"><path d="${star(13, 6)}"/></g>
      <g transform="translate(16 -83) scale(1.25)" fill="#FFC21A" stroke="#E9A300" stroke-width="1.5" stroke-linejoin="round"><path d="${star(13, 6)}"/></g>
      <path d="M-4 -85 Q0 -88 4 -85" stroke="#E9A300" stroke-width="2.8" fill="none" stroke-linecap="round"/>
      <path d="M-32 -88 L-39 -92 M32 -88 L39 -92" stroke="#E9A300" stroke-width="3" stroke-linecap="round"/>`,
  },

  /* ---------------- Neckwear ---------------- */
  {
    id: 'bowtie', slot: 'neck', name: 'Bow tie',
    svg: `<path d="M0 -46 L-19 -57 L-19 -35 Z" fill="#E5484D"/><path d="M0 -46 L19 -57 L19 -35 Z" fill="#E5484D"/>
      <path d="M-13 -52 L-13 -40 M13 -52 L13 -40" stroke="#C1363B" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="-5" y="-52" width="10" height="12" rx="4" fill="#C1363B"/>`,
  },
  {
    id: 'scarf', slot: 'neck', name: 'Cosy scarf',
    svg: `<path d="M-52 -58 Q0 -36 52 -58 L50 -43 Q0 -22 -50 -43 Z" fill="#034F46"/>
      <path d="M-34 -50 Q-32 -45 -30 -41 M-14 -45 L-13 -39 M8 -45 L9 -39 M28 -48 L29 -42" stroke="#F0D7FF" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M22 -37 L36 -33 L40 -8 L24 -4 Z" fill="#034F46"/>
      <path d="M24 -22 L38 -19 M24 -12 L39 -9" stroke="#F0D7FF" stroke-width="3" stroke-linecap="round"/>`,
  },
  {
    id: 'medal', slot: 'neck', name: 'Gold medal',
    svg: `<path d="M-12 -57 L0 -34 L12 -57" fill="none" stroke="#3E7BEA" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="0" cy="-28" r="12" fill="#FFC21A" stroke="#E9A300" stroke-width="2.2"/>
      <path transform="translate(0 -28) scale(.6)" d="${star(13, 5.5)}" fill="#fff6c9"/>`,
  },
];


/* ---------------- Chinese-themed set ---------------- */
const RED = '#D7263D';
const DRED = '#A3152A';
const GOLD = '#F2B705';
const DGOLD = '#C98F00';
const tassel = (x, y, len = 22, color = RED) => `<g><path d="M${x} ${y} L${x} ${y + len * 0.5}" stroke="${DGOLD}" stroke-width="1.6"/><circle cx="${x}" cy="${y + len * 0.5}" r="2.6" fill="${GOLD}"/><path d="M${x - 3.4} ${y + len * 0.5} L${x - 4.4} ${y + len} M${x} ${y + len * 0.5} L${x} ${y + len + 1} M${x + 3.4} ${y + len * 0.5} L${x + 4.4} ${y + len}" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/></g>`;
const fur = (y, w = 46) => Array.from({ length: 9 }, (_, i) => `<circle cx="${-w + (i * 2 * w) / 8}" cy="${y}" r="7.5" fill="#fff"/>`).join('');
const blossom = (x, y, r = 8, c = '#E94560', center = '#FFD83D') => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<circle cx="0" cy="${-r * 0.8}" r="${r * 0.62}" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="${r * 0.38}" fill="${center}"/></g>`;
const bow = (x, flip) => `<g transform="translate(${x} -116) scale(${flip * 1.3} 1.3)">
  <path d="M0 0 L22 -12 L24 12 Z" fill="${RED}"/><path d="M0 0 L-2 14 L-6 38 L6 34 L8 12 Z" fill="${DRED}"/><path d="M4 8 L14 30 L22 26 L12 6 Z" fill="${RED}"/>
  <rect x="-5" y="-6" width="10" height="12" rx="4" fill="${DRED}"/><path d="M9 -3 L18 -6 M10 4 L19 4" stroke="${GOLD}" stroke-width="1.8" stroke-linecap="round"/></g>`;
const lens = (cx, shape, stroke, w = 3.2, fill = '#fff', op = 0.14) => `<g transform="translate(${cx} -83)">${shape(stroke, w, fill, op)}</g>`;

COSMETICS.push(
  /* Hats */
  { id: 'qing', slot: 'hat', name: 'Qing dynasty hat',
    svg: `<path d="M-54 -102 Q0 -118 54 -102 Q44 -93 0 -93 Q-44 -93 -54 -102 Z" fill="#1A1A1A" stroke="${RED}" stroke-width="3"/>
      <path d="M-40 -102 C-42 -138 42 -138 40 -102 Z" fill="#232323"/><path d="M-41 -108 Q0 -100 41 -108 L41 -102 Q0 -94 -41 -102 Z" fill="${RED}"/>
      <circle cx="0" cy="-112" r="8" fill="${GOLD}" stroke="${DGOLD}" stroke-width="1.6"/><circle cx="0" cy="-112" r="3" fill="${RED}"/>
      <path d="M-2 -138 Q-10 -150 -2 -146 M2 -138 Q10 -150 2 -146" stroke="${RED}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="0" cy="-140" r="5" fill="${RED}"/>` },
  { id: 'tang', slot: 'hat', name: 'Tang hat',
    svg: `<path d="M-30 -110 C-32 -148 32 -148 30 -110 Z" fill="#202020"/>
      <path d="M-28 -126 L-70 -122 Q-77 -118 -70 -111 L-28 -113 Z" fill="#2A2A2A"/><path d="M28 -126 L70 -122 Q77 -118 70 -111 L28 -113 Z" fill="#2A2A2A"/>
      <path d="M-62 -118 L-34 -120 M62 -118 L34 -120" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="-31" y="-117" width="62" height="9" rx="3" fill="#111"/>
      <path d="M-12 -127 Q-6 -137 0 -127 Q6 -137 12 -127 Q6 -121 0 -127 Q-6 -121 -12 -127 Z" fill="${GOLD}"/>` },
  { id: 'headband', slot: 'hat', name: 'Chinese headband',
    svg: `<path d="M-51 -97 Q0 -131 51 -97" fill="none" stroke="#fff" stroke-width="17" stroke-linecap="round"/>
      <path d="M-44 -103 Q-30 -118 -18 -112 Q-8 -106 4 -116 Q16 -124 28 -114 Q36 -108 44 -105" fill="none" stroke="${RED}" stroke-width="3" stroke-linecap="round"/>
      <path d="M-51 -97 Q0 -123 51 -97" fill="none" stroke="${RED}" stroke-width="2.4"/>
      <path d="M49 -100 L72 -116 L70 -98 Z" fill="${RED}"/><path d="M49 -100 L66 -80 L72 -92 Z" fill="${DRED}"/>` },
  { id: 'dragonhat', slot: 'hat', name: 'Dragon hat',
    svg: `<path d="M-49 -100 C-52 -152 52 -152 49 -100 Z" fill="${RED}"/>
      <path d="M-22 -136 Q-30 -160 -42 -156 Q-36 -146 -34 -134 Z M22 -136 Q30 -160 42 -156 Q36 -146 34 -134 Z" fill="${GOLD}" stroke="${DGOLD}" stroke-width="1.4"/>
      <circle cx="-18" cy="-122" r="10" fill="#fff" stroke="${GOLD}" stroke-width="3"/><circle cx="18" cy="-122" r="10" fill="#fff" stroke="${GOLD}" stroke-width="3"/>
      <circle cx="-18" cy="-121" r="4.6" fill="#1A1A1A"/><circle cx="18" cy="-121" r="4.6" fill="#1A1A1A"/>
      <path d="M-8 -130 Q0 -140 8 -130 L5 -116 L-5 -116 Z" fill="${GOLD}"/>
      <g>${fur(-102)}</g><circle cx="-52" cy="-86" r="7" fill="#fff"/><circle cx="52" cy="-86" r="7" fill="#fff"/>
      <path d="M-52 -96 L-52 -90 M52 -96 L52 -90" stroke="${RED}" stroke-width="3"/>` },
  { id: 'pandahat', slot: 'hat', name: 'Panda hat',
    svg: `<circle cx="-36" cy="-134" r="14" fill="#1A1A1A"/><circle cx="36" cy="-134" r="14" fill="#1A1A1A"/>
      <path d="M-50 -97 C-54 -150 54 -150 50 -97 Q0 -108 -50 -97 Z" fill="#fff" stroke="#E7E4D8" stroke-width="1.4"/>
      <ellipse cx="-18" cy="-118" rx="9" ry="11" fill="#1A1A1A" transform="rotate(20 -18 -118)"/><ellipse cx="18" cy="-118" rx="9" ry="11" fill="#1A1A1A" transform="rotate(-20 18 -118)"/>
      <circle cx="-17" cy="-119" r="2.6" fill="#fff"/><circle cx="17" cy="-119" r="2.6" fill="#fff"/>
      <ellipse cx="0" cy="-108" rx="5" ry="3.4" fill="#1A1A1A"/>` },
  { id: 'lotus', slot: 'hat', name: 'Lotus hat',
    svg: `<ellipse cx="0" cy="-104" rx="62" ry="15" fill="#6FA23A"/><ellipse cx="0" cy="-106" rx="52" ry="10" fill="#8FC24D"/>
      <path d="M0 -106 L0 -98 M-30 -106 L-40 -99 M30 -106 L40 -99" stroke="#6FA23A" stroke-width="1.6"/>
      ${[-52, -26, 0, 26, 52].map((a) => `<ellipse cx="0" cy="-12" rx="9" ry="22" fill="${Math.abs(a) > 30 ? '#F7A8C4' : '#FFC1D6'}" transform="translate(0 -118) rotate(${a})"/>`).join('')}
      <ellipse cx="0" cy="-126" rx="6" ry="7" fill="#FFD83D"/>
      ${tassel(-52, -100, 24)}${tassel(52, -100, 24)}` },
  { id: 'newyear', slot: 'hat', name: 'New Year hat',
    svg: `<circle cx="-50" cy="-112" r="13" fill="${RED}" stroke="${GOLD}" stroke-width="2.4"/><circle cx="50" cy="-112" r="13" fill="${RED}" stroke="${GOLD}" stroke-width="2.4"/>
      <circle cx="-56" cy="-100" r="6.5" fill="#fff"/><circle cx="56" cy="-100" r="6.5" fill="#fff"/>
      <path d="M-46 -104 C-48 -142 48 -142 46 -104 Z" fill="${RED}"/><g>${fur(-104, 40)}</g>
      <path d="M0 -140 L15 -124 L0 -108 L-15 -124 Z" fill="${GOLD}" stroke="${DGOLD}" stroke-width="1.6"/>
      <text x="0" y="-118.5" font-size="14" font-weight="700" text-anchor="middle" fill="${RED}" font-family="'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif">福</text>` },
  { id: 'zhongshan', slot: 'hat', name: 'Zhongshan cap',
    svg: `<path d="M-44 -104 C-48 -142 48 -142 44 -104 Z" fill="#2E4A8E"/><path d="M-45 -112 Q0 -100 45 -112 L45 -102 Q0 -92 -45 -102 Z" fill="#243B73"/>
      <path d="M-30 -102 Q0 -92 30 -102 L30 -96 Q0 -88 -30 -96 Z" fill="#1A2B57"/>
      <g transform="translate(0 -122)"><path d="${star(10, 4.4)}" fill="${RED}" stroke="${GOLD}" stroke-width="1.2" stroke-linejoin="round"/></g>
      <path d="M-40 -126 Q0 -140 40 -126" stroke="#3C5CAB" stroke-width="2" fill="none"/>` },
  { id: 'chinacrown', slot: 'hat', name: 'Chinese crown',
    svg: `<path d="M-50 -106 C-62 -124 -56 -140 -38 -136 C-34 -150 -14 -154 0 -146 C14 -154 34 -150 38 -136 C56 -140 62 -124 50 -106 Z" fill="${GOLD}" stroke="${DGOLD}" stroke-width="2"/>
      <rect x="-50" y="-112" width="100" height="9" rx="4" fill="${DGOLD}"/>
      <circle cx="0" cy="-151" r="5.5" fill="${RED}"/>${blossom(-30, -126, 7)}${blossom(30, -126, 7)}${blossom(0, -128, 8)}
      <circle cx="-44" cy="-113" r="3" fill="${RED}"/><circle cx="44" cy="-113" r="3" fill="${RED}"/>
      ${tassel(-48, -104, 30)}${tassel(48, -104, 30)}${tassel(-40, -104, 22)}${tassel(40, -104, 22)}` },
  { id: 'plum', slot: 'hat', name: 'Plum blossom clip',
    svg: `<path d="M20 -122 Q34 -130 44 -122" stroke="#6B8E3A" stroke-width="3" fill="none"/><ellipse cx="24" cy="-128" rx="5" ry="2.6" fill="#6B8E3A" transform="rotate(-30 24 -128)"/>
      ${blossom(32, -118, 8)}${blossom(46, -128, 7, '#F0657B')}${blossom(40, -108, 6, '#FF8FA5')}
      ${tassel(46, -110, 24)}` },
  { id: 'hairpin', slot: 'hat', name: 'Hairpin',
    svg: `<path d="M-4 -118 L48 -134" stroke="${GOLD}" stroke-width="3.4" stroke-linecap="round"/><path d="M-4 -118 L48 -134" stroke="${DGOLD}" stroke-width="1" stroke-linecap="round"/>
      ${blossom(48, -135, 8, GOLD, RED)}<circle cx="60" cy="-132" r="2.6" fill="${GOLD}"/>${tassel(56, -128, 30)}` },
  { id: 'ribbon', slot: 'hat', name: 'Red ribbon',
    svg: `${bow(-38, -1)}${bow(38, 1)}` },

  /* Glasses */
  { id: 'rsun', slot: 'glasses', name: 'Round sunglasses',
    svg: `<circle cx="-16" cy="-83" r="13" fill="#14141C" stroke="${GOLD}" stroke-width="2.4"/><circle cx="16" cy="-83" r="13" fill="#14141C" stroke="${GOLD}" stroke-width="2.4"/>
      <path d="M-3 -86 Q0 -89 3 -86" stroke="${GOLD}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M-29 -86 L-38 -90 M29 -86 L38 -90" stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M-23 -90 L-18 -93 M9 -90 L14 -93" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".4"/>` },
  { id: 'scholar', slot: 'glasses', name: 'Scholar glasses',
    svg: `${lens(-16, (c, w, f, o) => `<rect x="-13.5" y="-10.5" width="27" height="21" rx="7" fill="${f}" fill-opacity="${o}" stroke="#14141C" stroke-width="4.4"/>`)}
      ${lens(16, (c, w, f, o) => `<rect x="-13.5" y="-10.5" width="27" height="21" rx="7" fill="${f}" fill-opacity="${o}" stroke="#14141C" stroke-width="4.4"/>`)}
      <path d="M-3 -88 Q0 -91 3 -88" stroke="#14141C" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-30 -88 L-39 -92 M30 -88 L39 -92" stroke="#14141C" stroke-width="3.6" stroke-linecap="round"/>` },
  { id: 'cloud', slot: 'glasses', name: 'Cloud glasses',
    svg: `${[-16, 16].map((x) => `<g transform="translate(${x} -83)" fill="#fff" fill-opacity=".14" stroke="${GOLD}" stroke-width="2.6"><circle r="11.5"/></g>
      <circle cx="${x + (x < 0 ? -12 : 12)}" cy="-88" r="3" fill="none" stroke="${GOLD}" stroke-width="2.2"/>`).join('')}
      <path d="M-4.5 -85 Q0 -89 4.5 -85" stroke="${GOLD}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M-28 -86 q-6 -3 -10 -1 M28 -86 q6 -3 10 -1" stroke="${GOLD}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="-16" cy="-95.5" r="3" fill="none" stroke="${GOLD}" stroke-width="2"/><circle cx="16" cy="-95.5" r="3" fill="none" stroke="${GOLD}" stroke-width="2"/>` },
  { id: 'dragonglasses', slot: 'glasses', name: 'Dragon glasses',
    svg: `${[-1, 1].map((d) => `<g transform="translate(${d * 16} -83) scale(${d} 1)"><path d="M-12 -4 Q-20 -14 -16 -22 Q-9 -14 -4 -12 Q-2 -22 2 -26 Q4 -16 8 -12 Q14 -14 18 -6 Q22 4 8 11 Q-6 14 -12 5 Z" fill="${RED}"/>
      <ellipse cx="2" cy="-1" rx="9.5" ry="7.5" fill="#fff" fill-opacity=".9"/><path d="M-8 -5 Q2 -12 14 -4" stroke="${GOLD}" stroke-width="2" fill="none" stroke-linecap="round"/></g>`).join('')}
      <path d="M-4 -86 Q0 -89 4 -86" stroke="${DRED}" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'calligraphy', slot: 'glasses', name: 'Calligraphy glasses',
    svg: `<circle cx="-16" cy="-83" r="13.5" fill="#FFFDF4" stroke="#14141C" stroke-width="3.4"/><circle cx="16" cy="-83" r="13.5" fill="#FFFDF4" stroke="#14141C" stroke-width="3.4"/>
      <path d="M-3 -86 Q0 -89 3 -86" stroke="#14141C" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M-29 -86 L-38 -90 M29 -86 L38 -90" stroke="#14141C" stroke-width="3" stroke-linecap="round"/>
      <g font-size="17" font-weight="700" text-anchor="middle" fill="#14141C" font-family="'Noto Serif SC','Songti SC','SimSun','Noto Sans SC',serif"><text x="-16" y="-77">中</text><text x="16" y="-77">国</text></g>` },
  { id: 'lanternglasses', slot: 'glasses', name: 'Lantern glasses',
    svg: `${[-16, 16].map((x) => `<g transform="translate(${x} -83)"><rect x="-6" y="-17" width="12" height="4" rx="1.4" fill="${GOLD}"/><ellipse cx="0" cy="-2" rx="14" ry="13" fill="${RED}" stroke="${DRED}" stroke-width="1.6"/>
      <path d="M0 -15 L0 11 M-7 -14 Q-9 -2 -7 10 M7 -14 Q9 -2 7 10" stroke="${DRED}" stroke-width="1.4" fill="none"/><rect x="-6" y="10" width="12" height="4" rx="1.4" fill="${GOLD}"/>
      <path d="M0 14 L0 22 M-3 22 L0 25 L3 22" stroke="${GOLD}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M-7 -8 Q-9 -3 -7 0" stroke="#fff" stroke-width="2" opacity=".4" fill="none" stroke-linecap="round"/></g>`).join('')}
      <path d="M-2 -86 L2 -86" stroke="${GOLD}" stroke-width="2.6"/>` },

  /* Neckwear */
  { id: 'hanfucape', slot: 'neck', name: 'Hanfu cape',
    svg: `<path d="M-48 -60 Q0 -42 48 -60 L62 -16 Q0 -2 -62 -16 Z" fill="${RED}"/><path d="M-48 -60 Q0 -42 48 -60" stroke="${GOLD}" stroke-width="3.4" fill="none"/>
      <path d="M-62 -16 Q0 -2 62 -16" stroke="${GOLD}" stroke-width="3" fill="none"/>
      <path d="M-40 -34 Q-30 -40 -22 -32 Q-30 -26 -40 -34 Z M40 -34 Q30 -40 22 -32 Q30 -26 40 -34 Z" fill="${GOLD}" opacity=".9"/>
      <circle cx="0" cy="-45" r="4.2" fill="${GOLD}"/><path d="M0 -42 L-5 -26 M0 -42 L5 -26" stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round"/>` },
  { id: 'cheongsam', slot: 'neck', name: 'Cheongsam cloak',
    svg: `<path d="M-48 -60 Q0 -42 48 -60 L62 -16 Q0 -2 -62 -16 Z" fill="#F4F1E8" stroke="#C9C6B8" stroke-width="1.4"/>
      ${[-40, -22, 22, 40].map((x, i) => `<g transform="translate(${x} ${i % 3 ? -26 : -34})"><circle r="6.5" fill="#E3EBFA" stroke="#3E67B5" stroke-width="1.6"/><circle r="2.4" fill="#3E67B5"/><path d="M0 -6.5 L0 6.5 M-6.5 0 L6.5 0" stroke="#3E67B5" stroke-width="1"/></g>`).join('')}
      <path d="M-48 -60 Q0 -42 48 -60" stroke="#3E67B5" stroke-width="3" fill="none"/><circle cx="0" cy="-45" r="3.6" fill="#3E67B5"/><path d="M0 -42 L-5 -27 M0 -42 L5 -27" stroke="#3E67B5" stroke-width="2.4" stroke-linecap="round"/>` },
  { id: 'dragonscarf', slot: 'neck', name: 'Dragon scarf',
    svg: `<path d="M-52 -58 Q0 -36 52 -58 L50 -43 Q0 -22 -50 -43 Z" fill="${RED}"/><path d="M20 -38 L38 -34 L44 -4 L26 0 Z" fill="${RED}"/>
      <path d="M-40 -49 Q-28 -56 -16 -46 Q-6 -38 6 -46 Q18 -54 30 -44" fill="none" stroke="${GOLD}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M27 -26 q6 -6 12 0 M27 -14 q6 -6 12 0" stroke="${GOLD}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M26 0 L44 -4 M28 -1 L28 6 M34 -2 L34 5 M40 -3 L40 4" stroke="${GOLD}" stroke-width="2" stroke-linecap="round"/>` },
  { id: 'luckybell', slot: 'neck', name: 'Lucky bell',
    svg: `<path d="M-30 -62 Q0 -34 30 -62" fill="none" stroke="${RED}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="0" cy="-36" r="11.5" fill="${GOLD}" stroke="${DGOLD}" stroke-width="2"/><path d="M-11 -34 L11 -34" stroke="${DGOLD}" stroke-width="1.6"/><circle cx="0" cy="-29" r="2" fill="${DGOLD}"/>
      <text x="0" y="-37" font-size="10.5" font-weight="700" text-anchor="middle" fill="${RED}" font-family="'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif">福</text>` },

  /* Held */
  { id: 'brush', slot: 'hand', name: 'Ink brush',
    svg: `<g transform="translate(66 -34) rotate(24)"><rect x="-3.6" y="-52" width="7.2" height="40" rx="3.6" fill="#B9793A"/><rect x="-3.6" y="-52" width="7.2" height="8" rx="3.6" fill="#8C5522"/>
      <path d="M-3.6 -14 L3.6 -14 L4.6 -6 L-4.6 -6 Z" fill="${GOLD}"/><path d="M-4.6 -6 Q-5.6 8 0 22 Q5.6 8 4.6 -6 Z" fill="#fff" stroke="#E5E2D6" stroke-width="1"/><path d="M-3.4 4 Q-3 14 0 22 Q3 14 3.4 4 Z" fill="#1A1A1A"/></g>` },
  { id: 'umbrella', slot: 'hand', name: 'Paper umbrella',
    svg: `<g transform="translate(58 -60) rotate(22)"><rect x="-1.8" y="-72" width="3.6" height="92" rx="1.8" fill="#B9793A"/>
      <path d="M-48 -64 Q-36 -112 0 -112 Q36 -112 48 -64 Q36 -72 24 -64 Q12 -72 0 -64 Q-12 -72 -24 -64 Q-36 -72 -48 -64 Z" fill="${RED}" stroke="${DRED}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M0 -112 L0 -64 M0 -112 L-24 -64 M0 -112 L24 -64 M0 -112 L-42 -68 M0 -112 L42 -68" stroke="${DRED}" stroke-width="1.2" opacity=".7"/>
      ${blossom(-18, -86, 5, '#FFC1D6')}${blossom(18, -86, 5, '#FFC1D6')}${blossom(0, -98, 5, '#FFE3EC')}<circle cx="0" cy="-113" r="2.6" fill="${GOLD}"/></g>` },
);

export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

/** Markup for an item id, or '' for none or an unknown id (or one from the wrong slot). */
export function cosmeticSvg(slot, id) {
  const item = id ? COSMETIC_BY_ID[id] : null;
  return item && item.slot === slot ? item.svg : '';
}
