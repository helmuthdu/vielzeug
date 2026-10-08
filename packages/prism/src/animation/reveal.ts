import { uniqueId } from '../core/ids';
import { createSvgElement, setAttributes } from '../svg/element';
import type { TransitionConfig } from '../types';
import { resolveEasing } from './easing';
import { startTween } from './transition';

const activeReveals = new WeakMap<Element, () => void>();

export function cancelReveal(parent: Element): void {
  activeReveals.get(parent)?.();
}

/** Traces final line geometry without replacing its dash or per-datum styling. */
export function playTraceReveal(
  parent: SVGGElement,
  bounds: { height: number; width: number },
  paths: readonly { d: string; end: number; start: number }[],
  strokeWidth: number,
  motion: TransitionConfig & { duration: number },
  signal?: AbortSignal,
): () => void {
  cancelReveal(parent);
  if (motion.duration <= 0 || signal?.aborted) return () => {};

  const maskId = uniqueId('prism-trace');
  const host = createSvgElement('defs');
  const padding = strokeWidth / 2;
  const mask = createSvgElement('mask', {
    height: bounds.height + strokeWidth,
    id: maskId,
    maskContentUnits: 'userSpaceOnUse',
    maskUnits: 'userSpaceOnUse',
    width: bounds.width + strokeWidth,
    x: -padding,
    y: -padding,
  });
  const traces = paths.map(({ d }) => {
    const trace = createSvgElement('path', {
      d,
      fill: 'none',
      pathLength: 1,
      stroke: 'white',
      'stroke-dasharray': '1 1',
      'stroke-dashoffset': 1,
      'stroke-width': strokeWidth,
    });
    mask.appendChild(trace);
    return trace;
  });
  host.appendChild(mask);
  parent.insertBefore(host, parent.firstChild);
  parent.setAttribute('mask', `url(#${maskId})`);

  let cancelTween: () => void = () => {};
  const finish = (): void => {
    activeReveals.delete(parent);
    parent.removeAttribute('mask');
    host.remove();
    signal?.removeEventListener('abort', finish);
    cancelTween();
  };
  activeReveals.set(parent, finish);
  signal?.addEventListener('abort', finish, { once: true });
  cancelTween = startTween({
    count: 1,
    duration: motion.duration,
    easing: resolveEasing(motion.easing),
    onComplete: finish,
    onFrame: (progress) => {
      const e = progress(0);
      for (const [i, trace] of traces.entries()) {
        const { start, end } = paths[i];
        const revealed = Math.max(0, Math.min(1, (e - start) / (end - start)));
        trace.setAttribute('stroke-dashoffset', String(1 - revealed));
      }
    },
    signal,
  });
  return finish;
}

export interface GrowRevealLane {
  anchor: number;
  height: number;
  width: number;
  x: number;
  y: number;
}

/** Reveals finished bars from their own baseline without distorting rounded corners. */
export function playGrowReveal(
  parent: SVGGElement,
  lanes: readonly GrowRevealLane[],
  paintFinal: () => void,
  motion: TransitionConfig & { duration: number },
  options: { axis: 'x' | 'y'; signal?: AbortSignal; stagger?: number },
): () => void {
  cancelReveal(parent);
  paintFinal();
  if (motion.duration <= 0 || lanes.length === 0 || options.signal?.aborted) return () => {};

  const clipId = uniqueId('prism-reveal');
  const host = createSvgElement('defs');
  const clipPath = createSvgElement('clipPath', { id: clipId });
  const rects = lanes.map((lane) => {
    const rect = createSvgElement('rect', { height: 0, width: 0, x: lane.x, y: lane.y });
    clipPath.appendChild(rect);
    return rect;
  });
  host.appendChild(clipPath);
  parent.insertBefore(host, parent.firstChild);
  parent.setAttribute('clip-path', `url(#${clipId})`);

  let cancelTween: () => void = () => {};
  const finish = (): void => {
    activeReveals.delete(parent);
    parent.removeAttribute('clip-path');
    host.remove();
    options.signal?.removeEventListener('abort', finish);
    cancelTween();
  };
  activeReveals.set(parent, finish);
  options.signal?.addEventListener('abort', finish, { once: true });
  cancelTween = startTween({
    count: lanes.length,
    duration: motion.duration,
    easing: resolveEasing(motion.easing),
    onComplete: finish,
    onFrame: (progress) => {
      for (const [i, rect] of rects.entries()) {
        const lane = lanes[i];
        const e = Math.max(0, Math.min(1, progress(i)));
        if (options.axis === 'y') {
          const top = lane.anchor + (lane.y - lane.anchor) * e;
          const bottom = lane.anchor + (lane.y + lane.height - lane.anchor) * e;
          setAttributes(rect, { height: Math.max(0, bottom - top), width: lane.width, y: top });
        } else {
          const left = lane.anchor + (lane.x - lane.anchor) * e;
          const right = lane.anchor + (lane.x + lane.width - lane.anchor) * e;
          setAttributes(rect, { height: lane.height, width: Math.max(0, right - left), x: left });
        }
      }
    },
    signal: options.signal,
    stagger: options.stagger,
  });
  return finish;
}
