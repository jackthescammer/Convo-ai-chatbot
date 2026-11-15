/*!
 * Convo mascot — animated SVG renderer for the Convo AI mascot.
 *
 * Draws one inline SVG and writes frames onto it with requestAnimationFrame. One shared
 * ticker drives every mascot on the page.
 *
 * Motion (option `motion`):
 *   'expressive' (default) — each state plays its own animation (waving, jumping, typing,
 *     talking, sparkles, hearts, confetti…), blinks, and blends between states over 0.4 s.
 *     No constant body bob, no jitter, no breathing: the body only moves on purpose.
 *   'still' — one held pose per state; moves only on a state change, poke() or lookAt, then
 *     the loop stops.
 *   'loop' — everything, including the idle hop and the bobs. Off-brand for the product.
 * No dependencies. Works in any browser, and in React through ConvoMascot.tsx.
 */
import { SLOTS, cosmeticSvg } from './cosmetics.js';

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => k * k * (3 - 2 * k);
const wave = (t, hz, phase = 0) => Math.sin(TAU * (hz * t + phase));
const absWave = (t, hz, phase = 0) => Math.abs(wave(t, hz, phase));
const pos = (v) => (v > 0 ? v : 0);
const bump = (u, a, b) => (u <= a || u >= b ? 0 : Math.sin((Math.PI * (u - a)) / (b - a)));
const backOut = (k) => {
  const x = clamp(k, 0, 1) - 1;
  return 1 + x * x * (2.7 * x + 1.7);
};
const r2 = (n) => Math.round(n * 100) / 100;

/** Keyframes [[time, value], ...] looped over `period`, eased between keys. */
function track(t, period, keys) {
  const n = keys.length;
  let u = ((t % period) + period) % period;
  if (u < keys[0][0]) u += period;
  for (let i = 0; i < n; i++) {
    const a = keys[i];
    const b = keys[(i + 1) % n];
    const ta = a[0];
    const tb = i + 1 < n ? b[0] : b[0] + period;
    if (u >= ta && u <= tb) return lerp(a[1], b[1], ease(tb === ta ? 0 : (u - ta) / (tb - ta)));
  }
  return keys[0][1];
}

function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Character                                                           */
/* ------------------------------------------------------------------ */

export const defaultCharacter = {
  body: '#FFD83D',
  bodyLight: '#FFF29A',
  bodyDark: '#E9B10C',
  bodyShade: '#C48E06',
  face: '#FFF3E4',
  faceLight: '#FFFCF6',
  faceEdge: '#F2D9BC',
  faceShade: '#B9772E',
  eye: '#1C1B24',
  mouth: '#6E2433',
  tongue: '#FF8399',
  accent: '#7C5CF5',
  accentSoft: '#A996F8',
  blush: '#FF8FAE',
  tear: '#8CD5FF',
  shadow: 'rgba(124, 92, 245, 0.16)',
};

const BODY =
  'M0 -131 C33 -131 54 -106 56 -66 C58 -30 46 -10 0 -10 C-46 -10 -58 -30 -56 -66 C-54 -106 -33 -131 0 -131 Z';
const HEART =
  'M0 8 C-3 5 -11 0.5 -11 -4.5 C-11 -8.8 -8 -11 -5.3 -11 C-3 -11 -1 -9.6 0 -7.6 C1 -9.6 3 -11 5.3 -11 C8 -11 11 -8.8 11 -4.5 C11 0.5 3 5 0 8 Z';
const SPARK = 'M0 -7 Q1 -1 7 0 Q1 1 0 7 Q-1 1 -7 0 Q-1 -1 0 -7 Z';
const DROP =
  'M0 -4.5 C2.2 -1.5 3.4 0.6 3.4 2.2 C3.4 4.2 1.9 5.4 0 5.4 C-1.9 5.4 -3.4 4.2 -3.4 2.2 C-3.4 0.6 -2.2 -1.5 0 -4.5 Z';
const CUBE = 'M0 -5 L4.5 -2.5 V2.5 L0 5 L-4.5 2.5 V-2.5 Z M-4.5 -2.5 L0 0 L4.5 -2.5 M0 0 V5';

function starPath(R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${r2(rr * Math.cos(a))} ${r2(rr * Math.sin(a))} `;
  }
  return d + 'Z';
}

/** Short motion dashes radiating from the origin around `angle` (degrees, SVG). */
function fan(angle, color, n = 3, len = 9, spread = 30, r0 = 4, width = 3.6) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (angle + (i - (n - 1) / 2) * spread) * DEG;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    s += `<path d="M${r2(cx * r0)} ${r2(sy * r0)} L${r2(cx * (r0 + len))} ${r2(sy * (r0 + len))}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  }
  return s;
}

/* ------------------------------------------------------------------ */
/* Pose                                                                */
/* ------------------------------------------------------------------ */

/** Every number the renderer reads. States return a part of it. */
const BASE = {
  x: 0, y: 0, rot: 0, sx: 1, sy: 1,
  yaw: 0, headY: 0, tilt: 0,
  armL: 14, armR: 14, footL: 0, footR: 0,
  gazeX: 0, gazeY: 0, antenna: 0, breath: 1,
  openL: 1, openR: 1, happyL: 0, happyR: 0, closedL: 0, closedR: 0, squintL: 0, squintR: 0,
  eyeSize: 1, browAngry: 0, browSad: 0, browUp: 0,
  mouthO: 0, mouthD: 0, smile: 0, frown: 0, blush: 0, tears: 0, face: 1,
};
const KEYS = Object.keys(BASE);
const FACE_KEYS = [
  'openL', 'openR', 'happyL', 'happyR', 'closedL', 'closedR', 'squintL', 'squintR',
  'eyeSize', 'browAngry', 'browSad', 'browUp', 'mouthO', 'mouthD', 'smile', 'frown', 'blush', 'tears',
];

const eyes = (open, happy, closed, squint) => ({
  openL: open, openR: open, happyL: happy, happyR: happy,
  closedL: closed, closedR: closed, squintL: squint, squintR: squint,
});
const OPEN = eyes(1, 0, 0, 0);
const HAPPY = eyes(0, 1, 0, 0);
const CLOSED = eyes(0, 0, 1, 0);
const SQUINT = eyes(0, 0, 0, 1);
const mixEyes = (a, b, k) => {
  const o = {};
  for (const key in a) o[key] = lerp(a[key], b[key], k);
  return o;
};

/** Faces hold whatever the mascot does (the `face` option). */
const FACES = {
  neutral: { ...OPEN },
  happy: { ...HAPPY },
  closed: { ...CLOSED, smile: 0.5 },
  squint: { ...SQUINT },
  wink: { ...OPEN, openR: 0, squintR: 1 },
  surprised: { ...OPEN, eyeSize: 1.16, mouthO: 1 },
  sad: { ...OPEN, eyeSize: 1.1, browSad: 1, frown: 0.7, tears: 1 },
  angry: { ...OPEN, eyeSize: 0.94, browAngry: 1, frown: 0.6 },
  love: { ...HAPPY, blush: 1 },
  curious: { ...OPEN, browUp: 1, eyeSize: 1.05 },
  laugh: { ...HAPPY, mouthD: 1, blush: 0.4 },
  talk: { ...OPEN, smile: 0.4 },
};

/* States: (t seconds in the state, r per-avatar random 0..1, B = 1 to allow the constant
   body bob and jitter, which only motion 'loop' does) → pose part + props. */
const STATES = {
  /* General poses */
  idle(t, r, B) {
    const u = (t + r * 9) % 9;
    const hop = B * bump(u, 5.2, 5.75);
    const glad = B * bump(u, 5.0, 6.2);
    return {
      rot: B * 1.2 * wave(t, 0.22),
      yaw: track(u, 9, [[0, 0], [2.4, 0], [2.9, -0.28], [4.3, -0.28], [4.8, 0], [6.6, 0], [7.1, 0.22], [8.2, 0.22], [8.7, 0]]),
      gazeX: track(u, 9, [[0, 0], [2.4, 0], [2.8, -0.7], [4.3, -0.7], [4.8, 0], [6.6, 0], [7, 0.6], [8.2, 0.6], [8.7, 0]]),
      gazeY: track(u, 9, [[0, 0], [6.6, 0], [7, 0.45], [8.2, 0.45], [8.7, 0]]),
      y: -9 * hop,
      sy: 1 + 0.05 * hop,
      sx: 1 - 0.03 * hop,
      armL: 14 + 22 * hop,
      armR: 14 + 22 * hop,
      ...mixEyes(OPEN, HAPPY, glad),
    };
  },
  wave(t, r, B) {
    return {
      ...HAPPY,
      rot: -3 + 1.5 * wave(t, 1.1),
      y: B * -1.5 * absWave(t, 1.1),
      yaw: 0.1,
      armR: 132 + 24 * wave(t, 2.2),
      armL: 18,
      props: { waveLines: 1 },
    };
  },
  curious(t) {
    return {
      rot: 6 + 2 * wave(t, 0.4),
      yaw: 0.22,
      tilt: 6,
      gazeX: 0.55 + 0.12 * wave(t, 0.3),
      gazeY: 0.15,
      browUp: 1,
      eyeSize: 1.05,
      armL: 12,
      armR: -14 + 4 * wave(t, 0.4),
    };
  },
  giggle(t, r, B) {
    return {
      ...HAPPY,
      armL: -122 + 5 * wave(t, 3),
      armR: -122 + 5 * wave(t, 3, 0.5),
      rot: 4 * wave(t, 1.4),
      y: B * -1.6 * absWave(t, 2.8),
      blush: 0.7,
    };
  },
  thinking(t) {
    return {
      yaw: 0.16,
      rot: 4 + 1.5 * wave(t, 0.35),
      gazeX: 0.5,
      gazeY: 0.65,
      openL: 0.55,
      browUp: 1,
      armR: -100 + 7 * pos(wave(t, 1.6)),
      armL: 10,
      props: { question: 1 },
    };
  },
  walking(t, r, B) {
    const s = wave(t, 1.7);
    return {
      ...HAPPY,
      y: B * -2.6 * Math.abs(s),
      rot: -5 + 3 * s,
      yaw: -0.3,
      footL: pos(s) * 6,
      footR: pos(-s) * 6,
      armL: 20 - 28 * s,
      armR: 20 + 28 * s,
      mouthO: 0.45,
      props: { stepMarks: 1 },
    };
  },
  resting(t, r, B) {
    return {
      ...HAPPY,
      sx: 0.97,
      sy: 0.93,
      rot: B * 1.5 * wave(t, 0.2),
      headY: -0.25,
      armL: -16,
      armR: -16,
      breath: 2.2,
      smile: 0.5,
    };
  },

  /* Emotions */
  happy(t, r, B) {
    return {
      ...HAPPY,
      rot: 5 * wave(t, 0.7),
      y: B * -2 * absWave(t, 1.4),
      armL: 24 + 8 * wave(t, 1.4),
      armR: 24 - 8 * wave(t, 1.4),
      blush: 0.25,
      props: { joy: 1 },
    };
  },
  surprised(t, r, B) {
    const jolt = bump(t, 0, 0.45);
    return {
      ...OPEN,
      eyeSize: 1.18,
      mouthO: 1,
      y: -10 * jolt,
      sy: 1 + 0.06 * jolt,
      x: B * 0.7 * wave(t, 9) * Math.exp(-t * 3),
      armL: 55 + 6 * wave(t, 0.8),
      armR: 55 + 6 * wave(t, 0.8, 0.5),
      rot: -2,
      gazeX: 0.08 * wave(t, 0.5),
      props: { exclaim: 1 },
    };
  },
  sad(t, r, B) {
    return {
      ...OPEN,
      eyeSize: 1.12,
      tears: 1,
      browSad: 1,
      frown: 0.7,
      armL: 4,
      armR: 4,
      sy: 0.97 - B * 0.02 * bump(t % 3.2, 0, 0.3),
      headY: -0.15,
      y: B * 0.8 * wave(t, 0.6),
      antenna: 26,
      gazeY: 0.1,
    };
  },
  angry(t, r, B) {
    return {
      ...OPEN,
      openL: 0.82,
      openR: 0.82,
      eyeSize: 0.94,
      browAngry: 1,
      frown: 0.6,
      x: B * 0.9 * wave(t, 13),
      armL: 34 + 6 * wave(t, 1.5),
      armR: 34 + 6 * wave(t, 1.5, 0.5),
      sy: 0.97,
      sx: 1.02,
      props: { anger: 1 },
    };
  },
  sleeping(t, r, B) {
    const b = B * wave(t, 0.28);
    return {
      ...CLOSED,
      smile: 0.45,
      sx: 0.97 - 0.02 * b,
      sy: 0.93 + 0.03 * b,
      rot: 4,
      headY: -0.3,
      armL: 6,
      armR: 6,
      antenna: 34,
      breath: 0,
      props: { zzz: 1 },
    };
  },
  love(t, r, B) {
    return {
      ...HAPPY,
      blush: 1,
      rot: 6 * wave(t, 0.55),
      y: B * -2 * absWave(t, 1.1),
      armL: -34,
      armR: -34,
      props: { hearts: 1 },
    };
  },

  /* Actions */
  reading(t) {
    return {
      gazeX: track(t, 3, [[0, -0.5], [2.4, 0.45], [2.8, -0.5]]),
      gazeY: -0.5,
      headY: -0.25,
      armL: -50,
      armR: -50 + 3 * wave(t, 0.5),
      rot: 2 * wave(t, 0.3),
      props: { book: 1 },
    };
  },
  typing(t) {
    return {
      yaw: 0.12,
      gazeX: 0.35 + 0.15 * wave(t, 0.4),
      gazeY: -0.45,
      headY: -0.2,
      armL: -28 + 7 * pos(wave(t, 4.2)),
      armR: -28 + 7 * pos(wave(t, 4.2, 0.5)),
      rot: 1.5,
      eyeSize: 1.02,
      props: { laptop: 1 },
    };
  },
  running(t, r, B) {
    const s = wave(t, 2.8);
    return {
      rot: 9,
      yaw: 0.32,
      gazeX: 0.5,
      y: B * -5 * Math.abs(s),
      footL: pos(s) * 9,
      footR: pos(-s) * 9,
      armL: 30 + 45 * s,
      armR: 30 - 45 * s,
      eyeSize: 1.05,
      mouthO: 0.6,
      antenna: -16,
      props: { speed: 1 },
    };
  },
  jumping(t) {
    const u = t % 1;
    const air = bump(u, 0.15, 0.75);
    const crouch = bump(u, 0, 0.15) + bump(u, 0.75, 1);
    return {
      ...HAPPY,
      mouthD: 1,
      y: -30 * air,
      sy: 1 + 0.06 * air - 0.1 * crouch,
      sx: 1 + 0.06 * crouch,
      armL: 150 + 15 * wave(t, 1),
      armR: 150 + 15 * wave(t, 1, 0.5),
      props: { burst: 1 },
    };
  },
  peeking(t) {
    return {
      x: track(t, 5, [[0, -14], [1.5, -14], [2.2, -5], [3.8, -5], [4.4, -14]]),
      yaw: -0.4,
      gazeX: -0.75,
      gazeY: 0.1,
      rot: -6,
      browUp: 1,
      eyeSize: 1.08,
      armL: 30,
      armR: 10,
      props: { wall: 1 },
    };
  },
  phone(t) {
    return {
      sx: 0.97,
      sy: 0.93,
      yaw: 0.35,
      gazeX: 0.7,
      gazeY: -0.2,
      eyeSize: 1.06,
      mouthO: 0.7,
      armL: -12,
      armR: 18,
      footL: pos(wave(t, 1.2)) * 5,
      footR: pos(wave(t, 1.2, 0.5)) * 5,
      props: { phone: 1, phoneLines: 1 },
    };
  },

  /* Interactions */
  heart(t, r, B) {
    return {
      armL: -55,
      armR: -55,
      gazeY: 0.15,
      rot: 3 * wave(t, 0.6),
      y: B * -1.5 * absWave(t, 1.2),
      blush: 0.35,
      props: { bigHeart: 1, sideHearts: 1 },
    };
  },
  chatting(t, r, B) {
    return {
      yaw: 0.18,
      gazeX: 0.55,
      gazeY: 0.55,
      rot: 3 + 1.5 * wave(t, 0.5),
      armL: 14,
      armR: 22,
      y: B * -1 * absWave(t, 0.9),
      props: { speech: 1 },
    };
  },
  star(t) {
    return {
      ...OPEN,
      openR: 0,
      squintR: 1,
      armR: -150 + 4 * wave(t, 0.8),
      armL: 16,
      rot: -4,
      yaw: 0.1,
      smile: 0.6,
      props: { star: 1, starLines: 1 },
    };
  },
  report(t) {
    return {
      yaw: 0.35,
      gazeX: 0.8,
      gazeY: 0.2,
      armR: 75 + 6 * wave(t, 0.8),
      armL: 12,
      rot: 3,
      eyeSize: 1.05,
      props: { card: 1 },
    };
  },
  back(t) {
    return {
      yaw: 2,
      rot: 2 * wave(t, 0.3),
      armL: 14 + 4 * wave(t, 0.3),
      armR: 14 - 4 * wave(t, 0.3),
    };
  },

  /* Special poses */
  cool(t, r, B) {
    return {
      rot: -4 + 2 * wave(t, 1),
      headY: B * -0.35 * absWave(t, 1),
      y: B * -1.5 * absWave(t, 1),
      tilt: -5,
      armL: 25,
      armR: 25,
      smile: 0.8,
      props: { shades: 1, sparkles: 1 },
    };
  },
  chill(t) {
    return {
      sx: 0.97,
      sy: 0.93,
      rot: -3 + 1.2 * wave(t, 0.25),
      tilt: -8,
      yaw: -0.15,
      armL: -15,
      armR: 35,
      smile: 0.7,
      breath: 2,
      props: { shades: 1 },
    };
  },
  celebrate(t, r, B) {
    return {
      ...SQUINT,
      armL: 150 + 15 * wave(t, 2.4),
      armR: 150 + 15 * wave(t, 2.4, 0.5),
      y: B * -8 * absWave(t, 1.2),
      sy: 1 + B * 0.04 * absWave(t, 1.2),
      rot: 4 * wave(t, 1.2),
      blush: 0.3,
      props: { confetti: 1 },
    };
  },
  peekaboo(t) {
    const look = track(t, 4, [[0, -0.6], [1.6, -0.6], [2, 0.6], [3.6, 0.6]]);
    return {
      y: 30,
      gazeX: look,
      yaw: look * 0.3,
      gazeY: 0.1,
      eyeSize: 1.05,
      props: { ledge: 1, peekLines: 1 },
    };
  },

  /* Conversation */
  listening(t) {
    return {
      rot: 5 + 1.5 * wave(t, 0.5),
      yaw: 0.12,
      gazeX: 0.2,
      gazeY: 0.15,
      eyeSize: 1.08,
      sy: 1.02,
      antenna: 4 * wave(t, 0.8),
      headY: -0.35 * bump(t % 2.4, 1.6, 2.1),
      props: { waves: 1 },
    };
  },
  talking(t, r, B) {
    const talk = Math.abs(Math.sin(t * 11) * Math.sin(t * 3.7 + 1));
    return {
      ...OPEN,
      mouthD: 0.25 + 0.6 * talk,
      y: B * -1.2 * absWave(t, 2),
      rot: 2 * wave(t, 0.6),
      armR: 26 + 26 * bump(t % 3, 0.3, 1.4),
      armL: 14 + 10 * bump(t % 3.4, 1.8, 2.6),
      gazeX: 0.08 * wave(t, 0.4),
    };
  },
};

/* Motion 'still' (the default) holds one frame of each state: this many seconds in, else 0. */
const KEY = { walking: 0.15, surprised: 1.2, reading: 1.2, running: 0.09, talking: 0.25 };

export const stateGroups = {
  general: ['idle', 'wave', 'curious', 'giggle', 'thinking', 'walking', 'resting'],
  emotions: ['happy', 'surprised', 'sad', 'angry', 'sleeping', 'love'],
  actions: ['reading', 'typing', 'running', 'jumping', 'peeking', 'phone'],
  interactions: ['heart', 'chatting', 'star', 'report', 'back'],
  special: ['cool', 'chill', 'celebrate', 'peekaboo'],
  conversation: ['listening', 'talking'],
};
export const stateNames = Object.keys(STATES);
export const faceNames = Object.keys(FACES);

/* Gestures laid over whatever plays: poke(name, turns). */
const GESTURES = {
  nod: { dur: 0.6, apply(p, k) { const e = Math.sin(Math.PI * k); p.headY -= 0.9 * e; p.sy -= 0.025 * e; } },
  bounce: {
    dur: 0.55,
    apply(p, k) {
      const e = Math.sin(Math.PI * k);
      p.y -= 16 * e;
      p.sy *= 1 + 0.06 * e - 0.08 * bump(k, 0.82, 1);
      p.armL += 25 * e;
      p.armR += 25 * e;
    },
  },
  spin: { dur: 0.9, apply(p, k) { p.yaw += 4 * ease(k); p.y -= 6 * Math.sin(Math.PI * k); } },
  shake: { dur: 0.7, apply(p, k) { const e = Math.sin(TAU * 2 * k) * (1 - k); p.yaw += 0.4 * e; p.rot += 2 * e; } },
  wiggle: { dur: 0.6, apply(p, k) { p.rot += 8 * Math.sin(TAU * 2.5 * k) * (1 - k); } },
  wave: {
    dur: 1.4,
    apply(p, k) {
      const e = Math.min(1, k * 6, (1 - k) * 6);
      p.armR = lerp(p.armR, 132 + 24 * Math.sin(TAU * 3 * k), e);
    },
  },
};
export const gestureNames = Object.keys(GESTURES);

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

/* layer: 'back' and 'fx' follow the mascot's position; 'mid' sits between body
   and arms, 'front' above the arms (both turn with the body); 'face' rides on the
   face; 'world' stays put. update(el, w, T, inst) gets the prop's weight 0..1. */
function propDefs(c, id) {
  const marks = (fans, hz = 1.2) => ({
    layer: 'fx',
    svg: fans.map(([x, y, a, n]) => `<g data-p data-x="${x}" data-y="${y}">${fan(a, c.accent, n || 3)}</g>`).join(''),
    update(el, w, T) {
      el._p.forEach((g, i) => {
        const s = backOut(w) * (0.88 + 0.22 * pos(wave(T, hz, i * 0.5)));
        setT(g, `translate(${g.dataset.x} ${g.dataset.y}) scale(${r2(s)})`);
      });
    },
  });
  const held = (x, y, a, hz = 0.3, amp = 2) => (el, w, T) =>
    setT(el, `translate(${x} ${r2(y + 10 * (1 - ease(w)))}) rotate(${r2(a + amp * wave(T, hz))})`);

  return {
    question: {
      layer: 'fx',
      svg: `<path d="M-6.5 -8 C-6.5 -16.5 7 -17.5 7 -8.5 C7 -3 0.5 -2 0.5 4" fill="none" stroke="${c.accent}" stroke-width="5.2" stroke-linecap="round"/><circle cx="0.5" cy="12" r="3.3" fill="${c.accent}"/>`,
      update: (el, w, T) => setT(el, `translate(52 ${r2(-150 + 3 * wave(T, 0.8))}) rotate(${r2(12 + 8 * wave(T, 0.45))}) scale(${r2(backOut(w))})`),
    },
    exclaim: {
      layer: 'fx',
      svg: `<rect x="-3.3" y="-19" width="6.6" height="17" rx="3.3" fill="${c.accent}"/><circle cy="7" r="3.6" fill="${c.accent}"/>`,
      update: (el, w, T) => setT(el, `translate(46 -150) rotate(${r2(14 + 5 * wave(T, 2.5))}) scale(${r2(backOut(w))})`),
    },
    zzz: {
      layer: 'fx',
      svg: [0, 1, 2].map(() => `<path data-p d="M-5 -5 H5 L-5 5 H5" fill="none" stroke="${c.accent}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`).join(''),
      update(el, w, T) {
        el._p.forEach((z, i) => {
          const ph = (T * 0.42 + i / 3) % 1;
          setT(z, `translate(${r2(30 + ph * 20 + 2 * wave(T, 0.7, i * 0.3))} ${r2(-124 - ph * 34)}) scale(${r2(0.55 + ph * 0.6)})`);
          setO(z, w * Math.sin(Math.PI * ph));
        });
      },
    },
    anger: {
      layer: 'fx',
      svg: [0, 90, 180, 270].map((a) => `<path d="M-8.5 -3 Q-3 -3 -3 -8.5" transform="rotate(${a})" fill="none" stroke="${c.accent}" stroke-width="3.4" stroke-linecap="round"/>`).join(''),
      update: (el, w, T) => setT(el, `translate(42 -134) scale(${r2(backOut(w) * (1 + 0.16 * pos(wave(T, 2.2))))})`),
    },
    hearts: {
      layer: 'fx',
      svg: [0, 1, 2].map(() => `<path data-p d="${HEART}" fill="url(#${id}-heart)"/>`).join(''),
      update(el, w, T) {
        el._p.forEach((h, i) => {
          const ph = (T * 0.33 + i / 3) % 1;
          setT(h, `translate(${r2(36 + i * 4 + 9 * wave(T, 0.6, i * 0.33))} ${r2(-110 - ph * 42)}) scale(${r2(0.5 + 0.55 * ph)})`);
          setO(h, w * Math.sin(Math.PI * ph));
        });
      },
    },
    sideHearts: {
      layer: 'fx',
      svg: [0, 1, 2].map(() => `<path data-p d="${HEART}" fill="url(#${id}-heart)"/>`).join(''),
      update(el, w, T) {
        const beat = 1 + 0.08 * Math.pow(pos(wave(T, 1.1)), 3);
        const k = backOut(w) * beat;
        const spots = [[55, -128 + 3 * wave(T, 0.6), 1.2, 12], [-56, -86, 0.62, -18], [-48, -68, 0.42, -8]];
        el._p.forEach((h, i) => {
          const [x, y, s, a] = spots[i];
          setT(h, `translate(${r2(x)} ${r2(y)}) rotate(${a}) scale(${r2(s * k)})`);
        });
      },
    },
    bigHeart: {
      layer: 'mid',
      svg: `<path d="${HEART}" fill="url(#${id}-heart)"/><ellipse cx="-5" cy="-5.5" rx="2.6" ry="1.7" fill="#fff" opacity=".6" transform="rotate(-30 -5 -5.5)"/>`,
      update: (el, w, T) => setT(el, `translate(0 ${r2(-44 + 10 * (1 - ease(w)))}) scale(${r2(2.05 * (1 + 0.05 * Math.pow(pos(wave(T, 1.1)), 3)))})`),
    },
    joy: {
      layer: 'fx',
      svg: `<path d="M2 -8.5 A9 9 0 1 0 2 8.5 A10 10 0 0 1 2 -8.5 Z" fill="${c.accent}"/>${fan(150, c.accent, 2, 5, 34, 13, 3)}`,
      update: (el, w, T) => setT(el, `translate(-50 -124) rotate(${r2(-15 + 10 * wave(T, 0.6))}) scale(${r2(backOut(w))})`),
    },
    burst: marks([[-44, -134, -140], [44, -134, -40]], 1),
    waveLines: marks([[68, -100, -35]], 2.2),
    starLines: marks([[58, -106, -70]]),
    phoneLines: marks([[66, -54, -35]]),
    peekLines: marks([[50, -96, -40]]),
    stepMarks: marks([[-50, -16, 200, 2]], 1.7),
    speech: {
      layer: 'fx',
      svg: `<path d="M-19 -12 Q-19 -20 -11 -20 H13 Q21 -20 21 -12 V2 Q21 10 13 10 H-3 L-12 17 L-10 10 H-11 Q-19 10 -19 2 Z" fill="#fff" fill-opacity=".9" stroke="${c.accentSoft}" stroke-width="2.4" stroke-linejoin="round"/>${[-8, 1, 10].map((x) => `<circle data-p cx="${x}" cy="-5" r="2.7" fill="${c.accent}"/>`).join('')}`,
      update(el, w, T) {
        setT(el, `translate(58 ${r2(-142 + 2 * wave(T, 0.7))}) scale(${r2(backOut(w))})`);
        el._p.forEach((d, i) => {
          const k = pos(wave(T, 1.4, -i * 0.16));
          setT(d, `translate(0 ${r2(-2.6 * k)})`);
          setO(d, 0.4 + 0.6 * k);
        });
      },
    },
    sparkles: {
      layer: 'fx',
      svg: `<path data-p d="${SPARK}" fill="#FFD84A"/><path data-p d="${SPARK}" fill="#FFD84A"/>`,
      update(el, w, T) {
        const spots = [[50, -122, 1.2], [60, -104, 0.75]];
        el._p.forEach((s, i) => {
          const [x, y, k] = spots[i];
          setT(s, `translate(${x} ${y}) rotate(${r2(15 * wave(T, 0.5, i * 0.3))}) scale(${r2(k * backOut(w) * (0.6 + 0.5 * pos(wave(T, 1.1, i * 0.4))))})`);
        });
      },
    },
    star: {
      layer: 'front',
      svg: `<path d="${starPath(13, 6.4)}" fill="url(#${id}-star)" stroke="#F7B500" stroke-width="3" stroke-linejoin="round"/><ellipse cx="-3.5" cy="-4" rx="2.4" ry="1.5" fill="#fff" opacity=".7" transform="rotate(-30 -3.5 -4)"/>`,
      update: (el, w, T) => setT(el, `translate(48 -80) rotate(${r2(-12 + 6 * wave(T, 0.8))}) scale(${r2(backOut(w))})`),
    },
    book: {
      layer: 'mid',
      svg: `<rect x="-22" y="17" width="44" height="5" rx="2" fill="#F1ECFF"/><rect x="-25" y="-24" width="50" height="44" rx="4.5" fill="#2F3352"/><rect x="-25" y="-24" width="8" height="44" rx="3.5" fill="#24273F"/><path d="M4 -13 L11 -2 L4 9 L-3 -2 Z" fill="#E7C57A"/><path d="M4 -8 L7.6 -2 L4 4 L0.4 -2 Z" fill="#2F3352" opacity=".45"/>`,
      update: held(0, -42, -6),
    },
    laptop: {
      layer: 'front',
      svg: `<rect x="-29" y="3" width="58" height="6" rx="3" fill="#7D7899"/><rect x="-25" y="-30" width="50" height="35" rx="4.5" fill="url(#${id}-lid)"/><rect x="-25" y="-30" width="50" height="35" rx="4.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/><path d="${SPARK}" transform="translate(0 -12.5) scale(.95)" fill="#fff"/>`,
      update: held(26, -24, -6, 0.2, 0.6),
    },
    phone: {
      layer: 'front',
      svg: `<rect x="-8.5" y="-14" width="17" height="28" rx="4" fill="#2A2B38"/><rect x="-6.5" y="-11.5" width="13" height="23" rx="2.6" fill="#454A66"/><path d="M-5 -5 L3 -11" stroke="#fff" stroke-opacity=".3" stroke-width="2.2" stroke-linecap="round"/>`,
      update: held(46, -28, 16, 0.5, 3),
    },
    card: {
      layer: 'fx',
      svg: `<rect x="-18" y="-25" width="36" height="50" rx="7" fill="url(#${id}-glass)" stroke="#fff" stroke-opacity=".9" stroke-width="1.5"/>${[0, 1, 2].map((i) => `<rect data-p x="${-12 + i * 5.4}" y="0" width="3.8" height="1" rx="1.2" fill="#fff"/>`).join('')}<path d="M-13 1.5 H3" stroke="#fff" stroke-opacity=".8" stroke-width="1.4" stroke-linecap="round"/><path d="${CUBE}" transform="translate(9 -12)" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="${CUBE}" transform="translate(9 11)" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M-13 12 H1 M-13 17 H-4" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/>`,
      update(el, w, T) {
        setT(el, `translate(74 ${r2(-98 + 3 * wave(T, 0.5))}) rotate(6) scale(${r2(backOut(w))})`);
        const hs = [6, 10, 15];
        el._p.forEach((b, i) => {
          const h = hs[i] * (0.75 + 0.25 * wave(T, 0.6, i * 0.2)) * w;
          b.setAttribute('y', r2(-1 - h));
          b.setAttribute('height', r2(Math.max(h, 0.1)));
        });
      },
    },
    confetti: {
      layer: 'back',
      svg: Array.from({ length: 14 }, (_, i) => `<rect data-p x="-2" y="-3.5" width="4" height="7" rx="1.4" fill="${[c.accent, '#FF6FA5', '#5BC0FF', '#4FD18B', '#FFB547', '#7C5CFC', '#FF6FA5'][i % 7]}"/>`).join(''),
      update(el, w, T, inst) {
        const bits = inst.confetti;
        el._p.forEach((b, i) => {
          const d = bits[i];
          const ph = ((T + d.delay) / 1.8) % 1;
          const x = Math.cos(d.a) * d.v * ph;
          const y = -110 + Math.sin(d.a) * d.v * ph + 70 * ph * ph;
          setT(b, `translate(${r2(x)} ${r2(y)}) rotate(${r2(d.spin * ph)})`);
          setO(b, w * (1 - ph * ph * ph));
        });
      },
    },
    speed: {
      layer: 'back',
      svg: [-88, -70, -52].map(() => `<path data-p d="M0 0 H18" stroke="${c.accentSoft}" stroke-width="4" stroke-linecap="round"/>`).join(''),
      update(el, w, T) {
        el._p.forEach((s, i) => {
          const ph = (T * 2.2 + i * 0.37) % 1;
          setT(s, `translate(${r2(-64 - ph * 22)} ${-88 + i * 18})`);
          setO(s, w * Math.sin(Math.PI * ph));
        });
      },
    },
    waves: {
      layer: 'fx',
      svg: [0, 1, 2, 3].map(() => `<path data-p d="M0 -6 Q5 0 0 6" fill="none" stroke="${c.accent}" stroke-width="2.8" stroke-linecap="round"/>`).join(''),
      update(el, w, T) {
        el._p.forEach((a, i) => {
          const ph = (T * 1.1 + (i >> 1) * 0.5) % 1;
          const off = 12 + ph * 11;
          setT(a, i % 2 ? `translate(${r2(-off)} -152) scale(-1 1)` : `translate(${r2(off)} -152)`);
          setO(a, w * Math.sin(Math.PI * ph));
        });
      },
    },
    shades: {
      layer: 'face',
      svg: `<path d="M-35 -89 H35" stroke="#15141B" stroke-width="3" stroke-linecap="round"/><path d="M-32 -90 H-3 Q-1.5 -90 -2 -87 L-3.8 -78 Q-5.4 -71.5 -12 -71.5 H-21.5 Q-29.8 -71.5 -31.4 -79 Z" fill="url(#${id}-lens)"/><path d="M32 -90 H3 Q1.5 -90 2 -87 L3.8 -78 Q5.4 -71.5 12 -71.5 H21.5 Q29.8 -71.5 31.4 -79 Z" fill="url(#${id}-lens)"/><path d="M-25 -86 L-28 -78 M19 -86 L16 -78" stroke="#fff" stroke-opacity=".45" stroke-width="2.4" stroke-linecap="round"/>`,
      update: (el, w) => setT(el, `translate(0 ${r2(-16 * (1 - ease(w)))})`),
    },
    wall: {
      layer: 'world',
      svg: `<rect x="-72" y="-172" width="24" height="176" rx="3" style="fill:var(--convo-mascot-wall,#F3F0FA)"/><rect x="-50" y="-172" width="3" height="176" style="fill:var(--convo-mascot-wall-edge,#DCD4F0)"/>`,
      update: (el, w) => setT(el, `translate(${r2(-24 * (1 - ease(w)))} 0)`),
    },
    ledge: {
      layer: 'world',
      svg: `<rect x="-100" y="-40" width="200" height="60" style="fill:var(--convo-mascot-surface,#F4F1FA)"/><path d="M-100 -40 H100" stroke-width="1.6" style="stroke:var(--convo-mascot-surface-edge,#DCD4F0)"/>`,
      update: (el, w) => setT(el, `translate(0 ${r2(40 * (1 - ease(w)))})`),
    },
  };
}

/* ------------------------------------------------------------------ */
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */

function setT(el, v) {
  if (el._t !== v) {
    el._t = v;
    el.setAttribute('transform', v);
  }
}
function setO(el, v) {
  const s = v < 0.004 ? 0 : v > 0.996 ? 1 : Math.round(v * 1000) / 1000;
  if (el._o !== s) {
    el._o = s;
    el.setAttribute('opacity', s);
    el.style.display = s === 0 ? 'none' : '';
  }
}

function markup(id, c, props) {
  const u = (n) => `url(#${id}-${n})`;
  const layer = (name) =>
    Object.entries(props)
      .filter(([, p]) => p.layer === name)
      .map(([k, p]) => `<g data-prop="${k}" opacity="0" style="display:none">${p.svg}</g>`)
      .join('');
  const eye = (s) => `
    <g data-k="eye${s}">
      <g data-k="eye${s}o">
        <ellipse rx="7.2" ry="9.5" fill="${u('eye')}"/>
        <circle data-k="hl${s}1" cx="2.4" cy="-3.6" r="2.5" fill="#fff"/>
        <circle data-k="hl${s}2" cx="-2.3" cy="3.6" r="1.2" fill="#fff" opacity=".85"/>
      </g>
      <path data-k="eye${s}h" d="M-7.5 2.5 Q0 -8.5 7.5 2.5" fill="none" stroke="${c.eye}" stroke-width="4.2" stroke-linecap="round"/>
      <path data-k="eye${s}c" d="M-7.5 -2 Q0 6.5 7.5 -2" fill="none" stroke="${c.eye}" stroke-width="4" stroke-linecap="round"/>
      <path data-k="eye${s}s" d="${s === 'L' ? 'M-5.5 -6.5 L5.5 0 L-5.5 6.5' : 'M5.5 -6.5 L-5.5 0 L5.5 6.5'}" fill="none" stroke="${c.eye}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse data-k="pool${s}" cy="9.5" rx="6.5" ry="2.4" fill="${c.tear}"/>
      <path data-k="tear${s}" d="${DROP}" fill="${c.tear}"/>
    </g>`;
  return `
<defs>
  <radialGradient id="${id}-body" cx="0.36" cy="0.28" r="0.82">
    <stop offset="0" stop-color="${c.bodyLight}"/><stop offset="0.5" stop-color="${c.body}"/><stop offset="1" stop-color="${c.bodyDark}"/>
  </radialGradient>
  <linearGradient id="${id}-ao" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.5" stop-color="${c.bodyShade}" stop-opacity="0"/><stop offset="1" stop-color="${c.bodyShade}" stop-opacity="0.38"/>
  </linearGradient>
  <radialGradient id="${id}-limb" cx="0.36" cy="0.3" r="0.9">
    <stop offset="0" stop-color="${c.bodyLight}"/><stop offset="0.55" stop-color="${c.body}"/><stop offset="1" stop-color="${c.bodyDark}"/>
  </radialGradient>
  <radialGradient id="${id}-spec"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <radialGradient id="${id}-face" cx="0.46" cy="0.42" r="0.62">
    <stop offset="0" stop-color="${c.faceLight}"/><stop offset="0.7" stop-color="${c.face}"/><stop offset="1" stop-color="${c.faceEdge}"/>
  </radialGradient>
  <radialGradient id="${id}-faceIn" cx="0.5" cy="0.66" r="0.6">
    <stop offset="0.8" stop-color="${c.faceShade}" stop-opacity="0"/><stop offset="1" stop-color="${c.faceShade}" stop-opacity="0.32"/>
  </radialGradient>
  <radialGradient id="${id}-eye" cx="0.4" cy="0.32" r="0.75"><stop offset="0" stop-color="#43414F"/><stop offset="1" stop-color="${c.eye}"/></radialGradient>
  <linearGradient id="${id}-heart" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#FFA3C8"/><stop offset="1" stop-color="#F04E8C"/></linearGradient>
  <linearGradient id="${id}-star" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FFEC8A"/><stop offset="1" stop-color="#FFC21A"/></linearGradient>
  <linearGradient id="${id}-lens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B3A49"/><stop offset="1" stop-color="#0E0E14"/></linearGradient>
  <linearGradient id="${id}-lid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C4BFE0"/><stop offset="1" stop-color="#8F8AB2"/></linearGradient>
  <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#DCE2FF" stop-opacity=".85"/><stop offset="1" stop-color="#A9B4F8" stop-opacity=".55"/></linearGradient>
  <clipPath id="${id}-clip"><path d="${BODY}"/></clipPath>
</defs>
<ellipse data-k="shadow" cx="0" cy="1" rx="46" ry="7" fill="${c.shadow}"/>
<g data-k="ant">
  <path data-k="stalk" d="M0 4 L0 -17" stroke="${c.bodyDark}" stroke-width="5.4" stroke-linecap="round" fill="none"/>
  <g data-k="ball">
    <circle cy="-23" r="8.6" fill="${u('limb')}"/>
    <ellipse cx="-2.6" cy="-26" rx="2.6" ry="2" fill="#fff" opacity=".6"/>
  </g>
</g>
<g data-k="back">${layer('back')}</g>
<g data-k="rig">
  <g data-k="bodyS">
    <ellipse data-k="footL" cx="-22" cy="-8" rx="16" ry="10.5" fill="${u('limb')}"/>
    <ellipse data-k="footR" cx="22" cy="-8" rx="16" ry="10.5" fill="${u('limb')}"/>
    <path d="${BODY}" fill="${u('body')}"/>
    <path d="${BODY}" fill="${u('ao')}"/>
    <ellipse cx="-25" cy="-112" rx="13" ry="7.5" fill="${u('spec')}" transform="rotate(-35 -25 -112)"/>
    <g clip-path="${u('clip')}">
      <g data-k="face">
        <ellipse cx="0" cy="-80.5" rx="39.5" ry="28.5" fill="${c.faceShade}" opacity=".16"/>
        <ellipse cx="0" cy="-82" rx="39" ry="27.5" fill="${u('face')}"/>
        <ellipse cx="0" cy="-82" rx="39" ry="27.5" fill="${u('faceIn')}"/>
        <ellipse data-k="blushL" cx="-27" cy="-70" rx="7" ry="4" fill="${c.blush}"/>
        <ellipse data-k="blushR" cx="27" cy="-70" rx="7" ry="4" fill="${c.blush}"/>
        ${eye('L')}${eye('R')}
        <path data-k="browL" d="M-6 0 L6 0" stroke="${c.eye}" stroke-width="3.2" stroke-linecap="round"/>
        <path data-k="browR" d="M-6 0 L6 0" stroke="${c.eye}" stroke-width="3.2" stroke-linecap="round"/>
        <ellipse data-k="mO" cx="0" cy="-65" rx="3.8" ry="4.6" fill="${c.mouth}"/>
        <g data-k="mD">
          <path d="M-8.5 0 L8.5 0 C8 7.5 4 11 0 11 C-4 11 -8 7.5 -8.5 0 Z" fill="${c.mouth}"/>
          <ellipse cx="0" cy="8" rx="4.6" ry="2.6" fill="${c.tongue}"/>
        </g>
        <path data-k="mSmile" d="M-5.5 -68 Q0 -63 5.5 -68" fill="none" stroke="${c.eye}" stroke-width="2.6" stroke-linecap="round"/>
        <path data-k="mFrown" d="M-5 -64 Q0 -68.5 5 -64" fill="none" stroke="${c.eye}" stroke-width="2.6" stroke-linecap="round"/>
        <g data-k="cosglasses"></g>
        ${layer('face')}
      </g>
    </g>
    <g data-k="cosneck"></g>
    <g clip-path="${u('clip')}" opacity=".24">
      <rect data-k="shL" x="-8.5" y="-6" width="21" height="36" rx="10.5" fill="${c.bodyShade}"/>
      <rect data-k="shR" x="-8.5" y="-6" width="21" height="36" rx="10.5" fill="${c.bodyShade}"/>
    </g>
  </g>
  <g data-k="coshat"></g>
  <g data-k="mid">${layer('mid')}</g>
  <g data-k="armsS">
    <g data-k="armL"><rect x="-10.5" y="-8" width="21" height="36" rx="10.5" fill="${u('limb')}"/></g>
    <g data-k="armR"><rect x="-10.5" y="-8" width="21" height="36" rx="10.5" fill="${u('limb')}"/></g>
  </g>
  <g data-k="front">${layer('front')}</g>
  <g data-k="coshand"></g>
</g>
<g data-k="fx">${layer('fx')}</g>
<g data-k="world">${layer('world')}</g>`;
}

/* ------------------------------------------------------------------ */
/* Shared ticker                                                       */
/* ------------------------------------------------------------------ */

const ticker = { live: new Set(), raf: 0 };
function wake(inst) {
  ticker.live.add(inst);
  if (!ticker.raf && typeof requestAnimationFrame === 'function') ticker.raf = requestAnimationFrame(tick);
}
function tick(now) {
  ticker.raf = 0;
  for (const inst of ticker.live) if (!inst.frame(now)) ticker.live.delete(inst);
  if (ticker.live.size) ticker.raf = requestAnimationFrame(tick);
}

const sameLook = (a, b) => (a == null && b == null) || (a != null && b != null && a[0] === b[0] && a[1] === b[1]);
let counter = 0;

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Draws a Convo mascot into `target` (an element to append to, or an <svg> to fill).
 * @param {Element} target
 * @param {import('./convo-mascot').MascotOptions} [options]
 * @returns {import('./convo-mascot').MascotHandle}
 */
export function createConvoMascot(target, options = {}) {
  const id = `cm${(++counter).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const c = { ...defaultCharacter, ...(options.character || {}) };
  const PROPS = propDefs(c, id);

  let svg = target;
  if (!(target instanceof SVGSVGElement)) {
    svg = document.createElementNS(NS, 'svg');
    target.appendChild(svg);
  }
  svg.setAttribute('viewBox', '-100 -180 200 200');
  svg.setAttribute('role', 'img');
  svg.style.overflow = 'visible';
  svg.style.pointerEvents = 'none';
  svg.style.transition = 'filter 300ms ease';
  svg.innerHTML = markup(id, c, PROPS);

  const k = {};
  svg.querySelectorAll('[data-k]').forEach((el) => (k[el.dataset.k] = el));
  const propEls = {};
  svg.querySelectorAll('[data-prop]').forEach((el) => {
    el._p = [...el.querySelectorAll('[data-p]')];
    propEls[el.dataset.prop] = el;
  });

  /* options */
  const o = {
    state: 'idle', face: null, lookAt: null, followPointer: false, paused: false, muted: false,
    settleAfterMs: 0, size: 240, ariaLabel: 'Convo mascot', onStateChange: null, freezeAt: null,
    seed: undefined, motion: 'expressive',
  };

  const rand = random(options.seed ?? (counter * 9973 + 17));
  const r = rand();
  const inst = {
    confetti: Array.from({ length: 14 }, () => ({
      a: (-160 + rand() * 140) * DEG,
      v: 50 + rand() * 45,
      spin: (rand() - 0.5) * 900,
      delay: rand() * 1.8,
    })),
    frame,
  };

  /* clock & state */
  let clock = 0;
  let last = 0;
  let stateStart = 0;
  let from = null;
  let blendStart = -1;
  let out = { ...BASE };
  const propW = Object.fromEntries(Object.keys(PROPS).map((p) => [p, 0]));
  let propTarget = {};
  const gestures = [];
  let blink = { next: 1.5 + rand() * 3, start: -1, double: false };
  let look = [0, 0];
  let lookW = 0;
  let pointer = null;
  let ant = { th: 0, v: 0, bx: 0, vx: 0, init: false };
  let lastChange = 0;
  let visible = true;
  let destroyed = false;

  const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const still = () => o.freezeAt != null || (reduced && reduced.matches);

  /* 'expressive' (default): states animate, no constant bob or jitter, no breathing.
     'still': one held pose per state. 'loop': everything, including the bob. */
  const mode = () => (o.motion === 'loop' || o.motion === 'still' ? o.motion : 'expressive');
  const looping = () => mode() === 'loop';

  function evalPose(t, rr, B) {
    const def = STATES[o.state] || STATES.idle;
    const part = def(t, rr, B);
    const p = { ...BASE, ...part };
    delete p.props;
    if (o.face && FACES[o.face]) {
      for (const key of FACE_KEYS) p[key] = BASE[key];
      Object.assign(p, FACES[o.face]);
    }
    return { p, props: part.props || {} };
  }

  let busy = false;

  function compose(dt, settle) {
    const loop = looping();
    const moving = mode() !== 'still';
    const t = moving || o.freezeAt != null ? clock - stateStart : KEY[o.state] ?? 0;
    const { p, props } = evalPose(t, moving ? r : 0, loop ? 1 : 0);
    propTarget = props;
    busy = false;

    if (from && !settle) {
      const kb = ease(clamp((clock - blendStart) / 0.42, 0, 1));
      if (kb >= 1) from = null;
      else for (const key of KEYS) p[key] = lerp(from[key], p[key], kb);
    }

    for (let i = gestures.length - 1; i >= 0; i--) {
      const g = gestures[i];
      const def = GESTURES[g.name];
      const local = (clock - g.start) / def.dur;
      if (local >= g.turns) { gestures.splice(i, 1); continue; }
      def.apply(p, local % 1);
    }

    const target = o.lookAt || (o.followPointer ? pointer : null);
    const kl = settle ? 1 : 1 - Math.exp(-dt * 7);
    if (target) {
      const tx = clamp(target[0], -1, 1);
      const ty = clamp(target[1], -1, 1);
      look[0] = lerp(look[0], tx, kl);
      look[1] = lerp(look[1], ty, kl);
      if (Math.abs(look[0] - tx) > 0.002 || Math.abs(look[1] - ty) > 0.002) busy = true;
    }
    lookW = lerp(lookW, target ? 1 : 0, kl);
    if (Math.abs(lookW - (target ? 1 : 0)) < 0.002) lookW = target ? 1 : 0;
    else busy = true;
    if (lookW > 0.001) {
      p.yaw += 0.38 * look[0] * lookW;
      p.headY += 0.9 * look[1] * lookW;
      p.rot += 2.5 * look[0] * lookW;
      p.gazeX = lerp(p.gazeX, look[0], 0.85 * lookW);
      p.gazeY = lerp(p.gazeY, look[1], 0.85 * lookW);
    }

    const br = loop ? p.breath * wave(clock, 0.42) : 0;
    p.sy *= 1 + 0.016 * br;
    p.sx *= 1 - 0.009 * br;

    let b = 0;
    if (!settle && moving) {
      if (clock >= blink.next && blink.start < 0) blink.start = clock;
      if (blink.start >= 0) {
        const kb = (clock - blink.start) / 0.15;
        if (kb >= 1) {
          blink.start = -1;
          const again = !blink.double && rand() < 0.18;
          blink.double = again;
          blink.next = clock + (again ? 0.12 : 2.2 + rand() * 3.6);
        } else b = Math.sin(Math.PI * kb);
      }
    }
    p.openL *= 1 - b;
    p.openR *= 1 - b;

    for (const name in propW) {
      const tw = props[name] ? 1 : 0;
      propW[name] = settle ? tw : lerp(propW[name], tw, 1 - Math.exp(-dt * 8));
      if (Math.abs(propW[name] - tw) < 0.002) propW[name] = tw;
      else busy = true;
    }
    if (from || gestures.length) busy = true;
    out = p;
    return b;
  }

  function antenna(p, dt, settle) {
    const rad = p.rot * DEG;
    const ry = -127 * p.sy + 10;
    const bx = p.x - ry * Math.sin(rad);
    const by = p.y - 10 + ry * Math.cos(rad);
    if (!ant.init || settle) {
      ant = { th: 0, v: 0, bx, vx: 0, by, vy: 0, len: 0, lv: 0, init: true };
    } else if (dt > 0) {
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      const vx = (bx - ant.bx) / dt;
      const vy = (by - ant.by) / dt;
      const ax = clamp((vx - ant.vx) / dt, -3000, 3000);
      const ay = clamp((vy - ant.vy) / dt, -5000, 5000);
      ant.bx = bx;
      ant.vx = vx;
      ant.by = by;
      ant.vy = vy;
      const loose = looping();
      for (let i = 0; i < steps; i++) {
        ant.v += (-170 * ant.th - (loose ? 7 : 18) * ant.v - 1.2 * ax) * h;
        ant.th = clamp(ant.th + ant.v * h, -38, 38);
        ant.lv += (-300 * ant.len - (loose ? 9 : 26) * ant.lv - 0.36 * ay) * h;
        ant.len = clamp(ant.len + ant.lv * h, -5, 7);
      }
    }
    return { bx, by, th: p.rot + p.antenna + ant.th };
  }

  function draw(p, a) {
    const T = mode() !== 'still' || o.freezeAt != null ? clock : 0.35;
    setT(k.rig, `translate(${r2(p.x)} ${r2(p.y)}) rotate(${r2(p.rot)} 0 -10)`);
    const sc = `scale(${r2(p.sx)} ${r2(p.sy)})`;
    setT(k.bodyS, sc);
    setT(k.armsS, sc);
    setT(k.fx, `translate(${r2(p.x)} ${r2(p.y)})`);
    setT(k.back, `translate(${r2(p.x)} ${r2(p.y)})`);

    const lift = clamp(-p.y / 70, 0, 0.45);
    setT(k.shadow, `translate(${r2(p.x)} 0) scale(${r2((1 - lift) * p.sx)} ${r2(1 - lift)})`);
    setO(k.shadow, 1 - lift);

    setT(k.ant, `translate(${r2(a.bx)} ${r2(a.by)}) rotate(${r2(a.th)})`);
    k.stalk.setAttribute('d', `M0 4 Q${r2(-ant.v * 0.012)} ${r2(-7 + ant.len * 0.5)} 0 ${r2(-17 + ant.len)}`);
    setT(k.ball, `translate(0 ${r2(ant.len)})`);

    const yr = (p.yaw * Math.PI) / 2;
    const cy = Math.cos(yr);
    const fx = 40 * Math.sin(yr);
    setT(k.face, `translate(${r2(fx)} ${r2(-p.headY * 7)}) rotate(${r2(p.tilt)} 0 -82) translate(0 -82) scale(${r2(Math.max(cy, 0.001))} 1) translate(0 82)`);
    setO(k.face, clamp(cy * 6, 0, 1) * p.face);

    const sh = 47 * Math.max(Math.abs(cy), 0.3);
    setT(k.armL, `translate(${r2(-sh)} -58) rotate(${r2(p.armL)})`);
    setT(k.armR, `translate(${r2(sh)} -58) rotate(${r2(-p.armR)})`);
    setT(k.shL, k.armL._t);
    setT(k.shR, k.armR._t);
    setT(k.footL, `translate(0 ${r2(-p.footL)})`);
    setT(k.footR, `translate(0 ${r2(-p.footR)})`);

    const gx = p.gazeX * 4.2;
    const gy = -p.gazeY * 3.4;
    for (const s of ['L', 'R']) {
      const side = s === 'L' ? -1 : 1;
      setT(k[`eye${s}`], `translate(${r2(side * 16 + gx)} ${r2(-83 + gy)}) scale(${r2(p.eyeSize)})`);
      const open = clamp(p[`open${s}`], 0, 1.3);
      setT(k[`eye${s}o`], `scale(1 ${r2(Math.max(open, 0.02))})`);
      setO(k[`eye${s}o`], clamp(open * 4, 0, 1));
      setO(k[`eye${s}h`], clamp(p[`happy${s}`], 0, 1));
      setO(k[`eye${s}c`], clamp(p[`closed${s}`], 0, 1));
      setO(k[`eye${s}s`], clamp(p[`squint${s}`], 0, 1));
      k[`hl${s}1`].setAttribute('r', r2(2.5 + 1.3 * p.tears));
      k[`hl${s}2`].setAttribute('r', r2(1.2 + 0.9 * p.tears));
      setO(k[`pool${s}`], 0.9 * p.tears * clamp(open, 0, 1));
      const ph = (T * 0.9 + (s === 'L' ? 0 : 0.5)) % 1;
      setT(k[`tear${s}`], `translate(${side * 2} ${r2(10 + ph * 18)}) scale(${r2(0.7 + 0.3 * (1 - ph))})`);
      setO(k[`tear${s}`], p.tears * Math.sin(Math.PI * ph) * clamp(open, 0, 1));
    }

    const browOn = Math.max(p.browAngry, p.browSad);
    setT(k.browL, `translate(${r2(-16 + gx * 0.5)} ${r2(-96 + 3 * p.browAngry - 2 * p.browSad - 5 * p.browUp + gy * 0.5)}) rotate(${r2(20 * p.browAngry - 16 * p.browSad - 10 * p.browUp)})`);
    setT(k.browR, `translate(${r2(16 + gx * 0.5)} ${r2(-96 + 3 * p.browAngry - 2 * p.browSad + gy * 0.5)}) rotate(${r2(-20 * p.browAngry + 16 * p.browSad)})`);
    setO(k.browL, clamp(Math.max(browOn, p.browUp), 0, 1));
    setO(k.browR, clamp(browOn, 0, 1));

    setO(k.blushL, 0.7 * p.blush);
    setO(k.blushR, 0.7 * p.blush);
    const mx = gx * 0.4;
    setT(k.mO, `translate(${r2(mx)} 0) translate(0 -65) scale(${r2(Math.max(p.mouthO, 0.01))}) translate(0 65)`);
    setO(k.mO, clamp(p.mouthO * 5, 0, 1));
    setT(k.mD, `translate(${r2(mx)} -71) scale(${r2(0.6 + 0.4 * p.mouthD)} ${r2(Math.max(p.mouthD, 0.01))})`);
    setO(k.mD, clamp(p.mouthD * 5, 0, 1));
    setO(k.mSmile, clamp(p.smile, 0, 1) * (1 - clamp(p.mouthD * 4, 0, 1)));
    setO(k.mFrown, clamp(p.frown, 0, 1));

    for (const name in PROPS) {
      const el = propEls[name];
      const w = propW[name];
      setO(el, w);
      if (w > 0) PROPS[name].update(el, w, T, inst);
    }
  }

  function frame(now) {
    if (destroyed) return false;
    if (o.paused || !visible || still()) {
      last = 0;
      return false;
    }
    const dt = last ? clamp((now - last) / 1000, 0, 0.1) : 1 / 60;
    last = now;
    clock += dt;
    const b = compose(dt, false);
    const a = antenna(out, dt, false);
    draw(out, a);
    if (
      mode() === 'still' && !busy &&
      Math.abs(ant.v) < 0.5 && Math.abs(ant.th) < 0.05 && Math.abs(ant.lv) < 0.5 && Math.abs(ant.len) < 0.02
    ) {
      last = 0;
      return false;
    }
    if (
      o.settleAfterMs > 0 &&
      clock - lastChange > o.settleAfterMs / 1000 &&
      b === 0 && !gestures.length && !from && Math.abs(ant.v) < 2
    ) {
      last = 0;
      return false;
    }
    return true;
  }

  function renderStill() {
    if (o.freezeAt != null) clock = stateStart + o.freezeAt;
    else clock = stateStart + 0.6;
    from = null;
    gestures.length = 0;
    compose(0, true);
    draw(out, antenna(out, 0, true));
  }

  function kick() {
    lastChange = clock;
    if (destroyed) return;
    if (still()) renderStill();
    else wake(inst);
  }

  function setState(name) {
    if (!STATES[name] || name === o.state) return;
    from = { ...out };
    blendStart = clock;
    o.state = name;
    stateStart = clock;
    if (o.onStateChange) o.onStateChange(name);
  }

  const onMove = (e) => {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.45;
    pointer = [
      clamp((e.clientX - cx) / Math.max(rect.width * 1.6, 220), -1, 1),
      clamp(-(e.clientY - cy) / Math.max(rect.height * 1.6, 220), -1, 1),
    ];
    kick();
  };
  const onLeave = (e) => {
    if (!e.relatedTarget) {
      pointer = null;
      kick();
    }
  };
  function listenPointer(on) {
    const fn = on ? 'addEventListener' : 'removeEventListener';
    window[fn]('pointermove', onMove, { passive: true });
    document[fn]('pointerout', onLeave);
    if (!on) pointer = null;
  }

  const io = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) wake(inst);
      })
    : null;
  if (io) io.observe(svg);
  const onReduced = () => kick();
  if (reduced && reduced.addEventListener) reduced.addEventListener('change', onReduced);

  function update(next = {}) {
    let changed = false;
    if ('character' in next && next.character) {
      /* Colours are baked into the markup: recreate the mascot to change them. */
    }
    if (next.state !== undefined && next.state !== o.state) {
      setState(next.state);
      changed = true;
    }
    for (const key of ['face', 'paused', 'muted', 'settleAfterMs', 'freezeAt', 'onStateChange', 'ariaLabel', 'size', 'motion']) {
      if (key in next && next[key] !== o[key]) {
        o[key] = next[key];
        changed = true;
      }
    }
    if ('lookAt' in next && !sameLook(next.lookAt, o.lookAt)) {
      o.lookAt = next.lookAt ? [next.lookAt[0], next.lookAt[1]] : null;
      changed = true;
    }
    if ('followPointer' in next && !!next.followPointer !== o.followPointer) {
      o.followPointer = !!next.followPointer;
      listenPointer(o.followPointer);
      changed = true;
    }
    if ('cosmetics' in next) {
      const worn = next.cosmetics || {};
      for (const slot of SLOTS) {
        const key = worn[slot] || '';
        if (k[`cos${slot}`] && k[`cos${slot}`]._w !== key) {
          k[`cos${slot}`]._w = key;
          k[`cos${slot}`].innerHTML = cosmeticSvg(slot, key);
        }
      }
    }
    if ('freezeAt' in next && next.freezeAt != null) stateStart = clock - next.freezeAt;
    svg.style.filter = o.muted ? 'grayscale(1)' : '';
    svg.setAttribute('aria-label', o.ariaLabel);
    if (o.size != null && !(target instanceof SVGSVGElement)) {
      const s = typeof o.size === 'number' ? `${o.size}px` : o.size;
      svg.style.width = s;
      svg.style.height = s;
    }
    if (changed) kick();
  }

  update({ ...options, state: undefined });
  if (options.state && STATES[options.state]) o.state = options.state;
  compose(1 / 60, true);
  draw(out, antenna(out, 0, true));
  kick();

  return {
    svg,
    update,
    setState: (name) => update({ state: name }),
    setFace: (face) => update({ face }),
    setCosmetics: (cosmetics) => update({ cosmetics }),
    lookAt: (point) => update({ lookAt: point }),
    poke(name, turns = 1) {
      if (!GESTURES[name] || still()) return;
      gestures.push({ name, start: clock, turns: Math.max(1, turns | 0) });
      kick();
    },
    get state() {
      return o.state;
    },
    destroy() {
      destroyed = true;
      ticker.live.delete(inst);
      if (io) io.disconnect();
      if (o.followPointer) listenPointer(false);
      if (reduced && reduced.removeEventListener) reduced.removeEventListener('change', onReduced);
      svg.innerHTML = '';
      if (svg !== target) svg.remove();
    },
  };
}
