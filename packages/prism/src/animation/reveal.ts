import { uniqueId } from '../core/ids';
import { createSvgElement } from '../svg/element';
import type { TransitionConfig } from '../types';
import { resolveEasing } from './easing';
import { startTween } from './transition';

/** Vertical rise (px) for fade-and-rise entrances. */
export const RISE_PX = 8;

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
 */
export function playReveal(
  parent: SVGGElement,
  bounds: { height: number; width: number; x?: number; y?: number },
  paintFinal: () => void,
  motion: TransitionConfig & { duration: number },
  options?: { delay?: number; signal?: AbortSignal },
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

  const finish = (): void => {
    activeReveals.delete(parent);
    parent.removeAttribute('clip-path');
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
      rect.setAttribute('width', String(bounds.width * progress(0)));
    },
    signal: options?.signal,
  });

  // startTween's cancel alone would only stop the frame loop; finish() also tears
  // the clip down, so a superseded wipe can never leave geometry partially hidden.
  activeReveals.set(parent, finish);

  return finish;
}

/**
 * Entrance for radial plots: every series paints its final shape synchronously, then
 * fades in while rising {@link RISE_PX} into place, each lane `stagger` ms behind the
 * previous. Only opacity and a group translate change, so no geometry deforms.
 * Returns a cancel function that snaps every lane to fully visible.
 */
export function playFadeRise(
  parent: SVGGElement,
  count: number,
  stagger: number,
  paintFinal: () => void,
  motion: TransitionConfig & { duration: number },
  options?: { signal?: AbortSignal },
): () => void {
  cancelReveal(parent);
  paintFinal();

  if (motion.duration <= 0 || count <= 0) return () => {};

  const groups = [...parent.children].slice(0, count) as SVGGElement[];
  const easing = resolveEasing(motion.easing);
  let cancelTween: () => void = () => {};

  const finish = (): void => {
    activeReveals.delete(parent);
    cancelTween();

    for (const group of groups) {
      group.removeAttribute('opacity');
      group.removeAttribute('transform');
    }
  };

  activeReveals.set(parent, finish);

  cancelTween = startTween({
    count,
    duration: motion.duration,
    easing,
    onComplete: finish,
    onFrame: (progress) => {
      for (const [i, group] of groups.entries()) {
        const e = progress(i);

        group.setAttribute('opacity', String(e));
        group.setAttribute('transform', `translate(0,${(RISE_PX * (1 - e)).toFixed(2)})`);
      }
    },
    signal: options?.signal,
    stagger,
  });

  return finish;
}
