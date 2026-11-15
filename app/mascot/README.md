# Convo mascot

Animated SVG renderer for the Convo mascot. It draws one inline SVG and writes frames with
`requestAnimationFrame` (one shared ticker for every mascot on the page), without re-rendering React.
No dependencies.

**Motion.** By default (`motion: 'expressive'`) each state plays its own animation: the arm waves,
`jumping` jumps, `typing` types, `talking` moves its mouth, and sparkles, hearts, Zz and confetti
move. The eyes blink, and a state change blends from the current pose over 0.4 s. There is no
constant body bob, no jitter and no breathing: in `idle` the mascot stands still, blinks and glances
around. Drive state changes from events (a reply arrived, a mistake was found, the conversation
ended), not from a timer.

| File                  | What it is                                         |
| --------------------- | -------------------------------------------------- |
| `convo-mascot.js`     | The engine. Plain ES module, works in any browser. |
| `convo-mascot.d.ts`   | Types for the engine.                              |
| `ConvoMascot.tsx`     | React wrapper (React 18 or 19).                    |
| `index.html`          | Demo: playground, a conversation turn, every state. |

## Demo

ES modules don't load from `file://`, so serve the folder:

```sh
npx serve mascot        # or: python -m http.server -d mascot
```

## React

Copy the folder into the frontend (for example `src/components/mascot/`).

```tsx
import { ConvoMascot, type ConvoMascotHandle } from './mascot/ConvoMascot'

export function Barista({ phase }: { phase: 'idle' | 'listening' | 'thinking' | 'chatting' | 'talking' }) {
  return <ConvoMascot state={phase} size={96} />
}

// Gestures
const ref = useRef<ConvoMascotHandle>(null)
<ConvoMascot ref={ref} state="idle" />
ref.current?.poke('bounce')
```

It reads `window`: in Next.js, render it from a client component (the file is marked `'use client'`).

## Without React

```js
import { createConvoMascot } from './convo-mascot.js'

const mascot = createConvoMascot(document.querySelector('#slot'), { state: 'idle', size: 120 })
mascot.setState('thinking')
mascot.poke('nod')
mascot.destroy()
```

## Options

| Option          | Type                 | Default        | Behaviour                                                        |
| --------------- | -------------------- | -------------- | ---------------------------------------------------------------- |
| `state`         | `MascotState`        | `idle`         | Changing it blends from the current pose in about 0.4 s.         |
| `motion`        | `'expressive' \| 'still' \| 'loop'` | `'expressive'` | `'still'`: one held pose per state, loop stops when settled. `'loop'`: adds the idle hop and body bobs (off-brand). |
| `face`          | `MascotFace \| null` | `null`         | Holds a face over whatever the state does.                       |
| `lookAt`        | `[x, y] \| null`     | `null`         | Turns head and eyes to a point; x right, y up, each -1..1.       |
| `followPointer` | `boolean`            | `false`        | Head follows the pointer. `lookAt` wins over it.                 |
| `paused`        | `boolean`            | `false`        | Freezes the mascot; nothing is computed.                         |
| `muted`         | `boolean`            | `false`        | Fades to grey in 300 ms.                                         |
| `settleAfterMs` | `number`             | `0`            | Stops the loop this long after the last change (rows, cards).    |
| `freezeAt`      | `number \| null`     | `null`         | One still frame this many seconds into the state.                |
| `seed`          | `number`             | per instance   | Same seed, same blinks and confetti. Read once.                  |
| `size`          | `number \| string`   | `240`          | Width and height. A number is in pixels.                         |
| `character`     | partial colours      | Convo yellow   | Colour overrides. Read once (change the React `key` to rebuild). |
| `ariaLabel`     | `string`             | `Convo mascot` | Accessible name.                                                 |
| `onStateChange` | `(state) => void`    | —              | Receives each new state.                                         |

Handle / ref: `poke(gesture, turns?)` with `nod`, `bounce`, `spin`, `shake`, `wiggle`, `wave`.

## States

From the character sheet, plus two for the conversation screen.

| Group        | States                                                              |
| ------------ | ------------------------------------------------------------------- |
| General      | `idle` `wave` `curious` `giggle` `thinking` `walking` `resting`     |
| Emotions     | `happy` `surprised` `sad` `angry` `sleeping` `love`                 |
| Actions      | `reading` `typing` `running` `jumping` `peeking` `phone`            |
| Interactions | `heart` `chatting` `star` `report` `back`                           |
| Special      | `cool` `chill` `celebrate` `peekaboo`                               |
| Conversation | `listening` `talking`                                               |

Faces: `neutral` `happy` `closed` `squint` `wink` `surprised` `sad` `angry` `love` `curious` `laugh` `talk`.

Suggested mapping for a conversation turn: `listening` while the learner types or speaks →
`thinking` while the model checks the sentence → `chatting` while the reply generates →
`talking` while it shows or speaks → `happy` / `celebrate` at the end, `report` on the report screen.

## Behaviour to know

- The SVG has `overflow: visible`: jumps, confetti and the floating card go past the box. Leave room.
- The mascot ignores pointer events. Wrap it in a `button` to make it clickable.
- The loop never runs while out of view. With `motion: 'still'` it also stops once nothing is
  changing. With `prefers-reduced-motion: reduce`, every mode shows one held pose and changes are instant.
- `followPointer` moves the head with every pointer move. Keep it off in the product unless the design asks for it.
- `peeking` and `peekaboo` draw a wall and a ledge. Match them to the page with the CSS variables
  `--convo-mascot-surface`, `--convo-mascot-surface-edge`, `--convo-mascot-wall`, `--convo-mascot-wall-edge`.
- The mascot is drawn in code from the sheet, not traced from it: proportions and shading are close, not identical.

## Cosmetics

`cosmetics.js` holds the hats, glasses and neckwear (plain SVG in the mascot's own coordinates). Pass
`cosmetics: { hat, glasses, neck }` (item ids) to `createConvoMascot`, or call `handle.setCosmetics(...)`
later. Glasses sit on the face group, so they follow its turn and tilt; hats and neckwear sit on the body.
