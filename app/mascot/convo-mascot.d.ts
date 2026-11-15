export type MascotState =
  | 'idle' | 'wave' | 'curious' | 'giggle' | 'thinking' | 'walking' | 'resting'
  | 'happy' | 'surprised' | 'sad' | 'angry' | 'sleeping' | 'love'
  | 'reading' | 'typing' | 'running' | 'jumping' | 'peeking' | 'phone'
  | 'heart' | 'chatting' | 'star' | 'report' | 'back'
  | 'cool' | 'chill' | 'celebrate' | 'peekaboo'
  | 'listening' | 'talking';

export type MascotFace =
  | 'neutral' | 'happy' | 'closed' | 'squint' | 'wink' | 'surprised'
  | 'sad' | 'angry' | 'love' | 'curious' | 'laugh' | 'talk';

export type MascotGesture = 'nod' | 'bounce' | 'spin' | 'shake' | 'wiggle' | 'wave';

export interface MascotCharacter {
  body: string;
  bodyLight: string;
  bodyDark: string;
  bodyShade: string;
  face: string;
  faceLight: string;
  faceEdge: string;
  faceShade: string;
  eye: string;
  mouth: string;
  tongue: string;
  accent: string;
  accentSoft: string;
  blush: string;
  tear: string;
  shadow: string;
}

export interface MascotOptions {
  /** What the mascot is in. Changing it blends there from the current pose. Unknown names change nothing. */
  state?: MascotState;
  /**
   * 'expressive' (default): each state plays its animation (waving, jumping, typing, talking,
   * sparkles, hearts, confetti) and the eyes blink, with no constant body bob, jitter or breathing.
   * 'still': one held pose per state; moves only on a state change, a gesture or lookAt.
   * 'loop': everything, including the idle hop and bobs. Don't use 'loop' in the product.
   */
  motion?: 'expressive' | 'still' | 'loop';
  /** A face held over whatever the state does. `null` lets the state choose. */
  face?: MascotFace | null;
  /** A point to look at: x to the right, y up, each -1..1. Wins over `followPointer`. */
  lookAt?: readonly [number, number] | null;
  /** The head follows the pointer anywhere on the page. */
  followPointer?: boolean;
  /** Stops the mascot where it is. Nothing is computed meanwhile. */
  paused?: boolean;
  /** Fades the mascot to grey in 300 ms. */
  muted?: boolean;
  /** Stops the frame loop this long after the last change, at a moment the eyes are open. For list rows and cards. */
  settleAfterMs?: number;
  /** Renders one still frame this many seconds into the state (thumbnails, tests). */
  freezeAt?: number | null;
  /** Same seed, same blink timing and confetti. Read once. */
  seed?: number;
  /** Width and height when the mascot creates its own svg. A number is in pixels. Default 240. */
  size?: number | string;
  /** Accessible name. Default "Convo mascot". */
  ariaLabel?: string;
  /** Colour overrides. Read once: create the mascot again to change them. */
  character?: Partial<MascotCharacter>;
  /** Items worn, by slot: hat, glasses, neck, hand (ids from cosmetics.js). Missing or unknown means none. */
  cosmetics?: { hat?: string | null; glasses?: string | null; neck?: string | null; hand?: string | null } | null;
  /** Receives the new state name. */
  onStateChange?: ((state: MascotState) => void) | null;
}

export interface MascotHandle {
  readonly svg: SVGSVGElement;
  readonly state: MascotState;
  update(options: Omit<MascotOptions, 'seed' | 'character'>): void;
  setState(state: MascotState): void;
  setFace(face: MascotFace | null): void;
  /** Changes what the mascot wears. */
  setCosmetics(cosmetics: MascotOptions['cosmetics']): void;
  lookAt(point: readonly [number, number] | null): void;
  /** Lays a gesture over what plays, `turns` times in a row. */
  poke(gesture: MascotGesture, turns?: number): void;
  destroy(): void;
}

/** Draws a mascot into `target`: appends an svg to an element, or fills an existing <svg>. */
export declare function createConvoMascot(target: Element, options?: MascotOptions): MascotHandle;

export declare const defaultCharacter: MascotCharacter;
export declare const stateNames: MascotState[];
export declare const stateGroups: {
  general: MascotState[];
  emotions: MascotState[];
  actions: MascotState[];
  interactions: MascotState[];
  special: MascotState[];
  conversation: MascotState[];
};
export declare const faceNames: MascotFace[];
export declare const gestureNames: MascotGesture[];
