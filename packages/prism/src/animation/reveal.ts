import { uniqueId } from '../core/ids';
import { createSvgElement, setAttributes } from '../svg/element';
import type { TransitionConfig } from '../types';
import { resolveEasing } from './easing';
import { startTween } from './transition';

/** Vertical settle (px) added to a wipe so the plot drifts into place as it is drawn. */
export const REVEAL_SETTLE_PX = 4;

/** Added per series index to stagger a multi-series entrance. */
export const SERIES_REVEAL_STAGGER = 60;

const activeReveals = new WeakMap<Element, () => void>();

/**
 * Cancels an in-flight entrance on `parent`, snapping it to fully visible. Renderers
 * call this before an update tween so an interrupted entrance can never keep hiding
 * freshly updated geometry.
 */
export function cancelReveal(parent: Element): void {
  activeReveals.get(parent)?.();
}

/**
 * Entrance for plots whose final geometry must never deform: the final frame is
 * painted synchronously, then a clip rectangle wipes left to right across `bounds`
 * to reveal it. The clip exists only for the entrance and is removed when it ends,
 * so a settled chart carries no clip DOM at all.
 *
 * An entrance superseded mid-flight — by a resize, a later reveal, or an update
 * through {@link cancelReveal} — snaps to fully visible instead of freezing a
 * partial wipe. Returns a cancel function with the same effect, for callers that
 * rebuild their DOM per render and cannot look the parent up again.
 *
 * With `settle`, the group also fades in and drifts up {@link REVEAL_SETTLE_PX} while
 * the wipe runs, so the entrance carries motion energy instead of being a pure reveal.
 */
export function playReveal(
  parent: SVGGElement,
  bounds: { height: number; width: number; x?: number; y?: number },
  paintFinal: () => void,
  motion: TransitionConfig & { duration: number },
  options?: { delay?: number; settle?: boolean; signal?: AbortSignal },
): () => void {
  cancelReveal(parent);
  paintFinal();

  if (motion.duration <= 0 || bounds.width <= 0) return () => {};

  const clipId = uniqueId('prism-reveal');
  const host = parent.querySelector('defs') ?? createSvgElement('defs');

  if (!parent.querySelector('defs')) parent.insertBefore(host, parent.firstChild);

  const clipPath = createSvgElement('clipPath', { id: clipId });
  const rect = createSvgElement('rect', {
    height: bounds.height,
    width: 0,
    x: bounds.x ?? 0,
    y: bounds.y ?? 0,
  });

  clipPath.appendChild(rect);
  host.appendChild(clipPath);
  parent.setAttribute('clip-path', `url(#${clipId})`);

  const easing = resolveEasing(motion.easing);
  let cancelTween: () => void = () => {};

  const settle = options?.settle ?? false;

  const finish = (): void => {
    activeReveals.delete(parent);
    parent.removeAttribute('clip-path');
    parent.removeAttribute('opacity');
    parent.removeAttribute('transform');
    clipPath.remove();
    if (host.childNodes.length === 0) host.remove();
    cancelTween();
  };

  cancelTween = startTween({
    count: 1,
    delay: options?.delay ?? 0,
    duration: motion.duration,
    easing,
    onComplete: finish,
    onFrame: (progress) => {
      const e = progress(0);

      rect.setAttribute('width', String(bounds.width * e));

      if (settle) {
        parent.setAttribute('opacity', String(e));
        parent.setAttribute('transform', `translate(0,${(REVEAL_SETTLE_PX * (1 - e)).toFixed(2)})`);
      }
    },
    signal: options?.signal,
  });

  // startTween's cancel alone would only stop the frame loop; finish() also tears
  // the clip down, so a superseded wipe can never leave geometry partially hidden.
  activeReveals.set(parent, finish);

  return finish;
}

/** One revealed slot in a {@link playGrowReveal} entrance, in final geometry. */
export interface GrowRevealLane {
  /** Screen coordinate the lane grows away from: the bar's own baseline edge. */
  anchor: number;
  height: number;
  width: number;
  x: number;
  y: number;
}

/**
 * Entrance for bar plots: the final bars are painted once, then one clip rectangle
 * per lane grows away from the lane's `anchor` to reveal it. Growing the rects
 * themselves from `height: 0` instead would spend the first frames as a 1-3 px
 * sliver, where the browser clamps `rx` and the rounded corners visibly pop — a
 * reveal shows the finished shape from each lane's first frame.
 *
 * Each lane is staggered, so a row of bars grows out left to right (or top to bottom).
 */
export function playGrowReveal(
  parent: SVGGElement,
  lanes: readonly GrowRevealLane[],
  paintFinal: () => void,
  motion: TransitionConfig & { duration: number },
  options: { axis: 'x' | 'y'; signal?: AbortSignal; stagger?: number },
): () => void {
  cancelReveal(parent);
  paintFinal();

  if (motion.duration <= 0 || lanes.length === 0) return () => {};

  const { axis, stagger = 0 } = options;
  const clipId = uniqueId('prism-reveal');
  const host = parent.querySelector('defs') ?? createSvgElement('defs');

  if (!parent.querySelector('defs')) parent.insertBefore(host, parent.firstChild);

  const clipPath = createSvgElement('clipPath', { id: clipId });
  const rects = lanes.map((lane) => {
    const rect = createSvgElement('rect', { height: 0, width: 0, x: lane.x, y: lane.y });

    clipPath.appendChild(rect);

    return rect;
  });

  host.appendChild(clipPath);
  parent.setAttribute('clip-path', `url(#${clipId})`);

  const easing = resolveEasing(motion.easing);
  let cancelTween: () => void = () => {};

  const finish = (): void => {
    activeReveals.delete(parent);
    parent.removeAttribute('clip-path');
    clipPath.remove();
    if (host.childNodes.length === 0) host.remove();
    cancelTween();
  };

  cancelTween = startTween({
    count: lanes.length,
    duration: motion.duration,
    easing,
    onComplete: finish,
    onFrame: (progress) => {
      for (const [lane, rect] of rects.entries()) {
        const final = lanes[lane];
        const e = progress(lane);

        // Both edges travel away from the anchor, which covers bars on either side
        // of a zero baseline without special-casing their sign.
        if (axis === 'y') {
          const top = final.anchor + (final.y - final.anchor) * e;
          const bottom = final.anchor + (final.y + final.height - final.anchor) * e;

          setAttributes(rect, { height: Math.max(0, bottom - top), width: final.width, y: top });
        } else {
          const left = final.anchor + (final.x - final.anchor) * e;
          const right = final.anchor + (final.x + final.width - final.anchor) * e;

          setAttributes(rect, { height: final.height, width: Math.max(0, right - left), x: left });
        }
      }
    },
    signal: options.signal,
    stagger,
  });

  activeReveals.set(parent, finish);

  return finish;
}
