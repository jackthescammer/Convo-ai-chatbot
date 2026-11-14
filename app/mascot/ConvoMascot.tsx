'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react';
import {
  createConvoMascot,
  type MascotGesture,
  type MascotHandle,
  type MascotOptions,
  type MascotState,
} from './convo-mascot.js';

export interface ConvoMascotProps extends Omit<MascotOptions, 'size'> {
  /** Width and height. A number is in pixels. Default 240. */
  size?: number | string;
  /** Class of the svg itself (there is no wrapper). */
  className?: string;
  /** Inline styles of the svg. Leave room around it: the body can move past its box. */
  style?: CSSProperties;
}

export interface ConvoMascotHandle {
  /** Lays a gesture over what plays: nod, bounce, spin, shake, wiggle, wave. */
  poke(gesture: MascotGesture, turns?: number): void;
}

/**
 * React renderer for the Convo mascot. Draws the svg once and animates it outside React's
 * render cycle. `character` and `seed` are read on mount: change the component's `key` to
 * apply new ones. Renders in the browser only (reads `window`).
 */
export const ConvoMascot = forwardRef<ConvoMascotHandle, ConvoMascotProps>(function ConvoMascot(
  {
    size = 240,
    className,
    style,
    ariaLabel = 'Convo mascot',
    character,
    seed,
    onStateChange,
    state,
    face = null,
    lookAt = null,
    followPointer = false,
    paused = false,
    muted = false,
    settleAfterMs = 0,
    freezeAt = null,
    motion = 'expressive',
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const engine = useRef<MascotHandle | null>(null);
  const onChange = useRef(onStateChange);
  onChange.current = onStateChange;

  const live = { state, face, lookAt, followPointer, paused, muted, settleAfterMs, freezeAt, motion, ariaLabel };
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    const mascot = createConvoMascot(svgRef.current!, {
      ...liveRef.current,
      character,
      seed,
      onStateChange: (s: MascotState) => onChange.current?.(s),
    });
    engine.current = mascot;
    return () => {
      mascot.destroy();
      engine.current = null;
    };
    // character and seed are read once, by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookX = lookAt ? lookAt[0] : NaN;
  const lookY = lookAt ? lookAt[1] : NaN;
  useEffect(() => {
    engine.current?.update(liveRef.current);
  }, [state, face, lookX, lookY, followPointer, paused, muted, settleAfterMs, freezeAt, motion, ariaLabel]);

  useImperativeHandle(ref, () => ({ poke: (g, turns) => engine.current?.poke(g, turns) }), []);

  const box = typeof size === 'number' ? `${size}px` : size;
  return <svg ref={svgRef} width={box} height={box} className={className} style={style} role="img" aria-label={ariaLabel} />;
});

export default ConvoMascot;
