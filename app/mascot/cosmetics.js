/*!
 * Convo mascot cosmetics: hats, glasses and neckwear drawn in the mascot's own coordinates
 * (viewBox -100 -180 200 200; head top at y -131, eyes at x ±16, y -83, face bottom at y -54).
 *
 * Each item is plain SVG markup with no ids or gradients, so any number can sit on a page.
 * Slots: 'hat' (drawn over the head), 'glasses' (drawn on the face, so they follow its turn
 * and tilt) and 'neck' (drawn over the body below the face).
 */

const INK = '#1A1A1A';

export const SLOTS = ['hat', 'glasses', 'neck'];
export const SLOT_LABEL = { hat: 'Hats', glasses: 'Glasses', neck: 'Neckwear' };

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

export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

/** Markup for an item id, or '' for none or an unknown id (or one from the wrong slot). */
export function cosmeticSvg(slot, id) {
  const item = id ? COSMETIC_BY_ID[id] : null;
  return item && item.slot === slot ? item.svg : '';
}
