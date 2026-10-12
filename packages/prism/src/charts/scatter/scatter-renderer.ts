import { warn } from '../../_dev';
import { resolveEasing } from '../../animation/easing';
import { resolveMotion } from '../../animation/motion';
import { startTween } from '../../animation/transition';
import { tweenNumber } from '../../animation/tween';
import type { DatumMark } from '../../core/datum-style';
import { createSvgElement, setAttributes } from '../../svg/element';
import type { Point } from '../../svg/path';
import type { ContinuousDatum, Scale, TransitionOption } from '../../types';

export interface ScatterRenderOptions {
  color: string;
  /** Aborted when the owning chart is disposed: stops the transition's `requestAnimationFrame` loop from rescheduling. */
  disposalSignal?: AbortSignal;
  /** Per-datum presentation parallel to `points`; only `opacity` applies to a scatter marker. */
  marks?: readonly DatumMark[];
  pointRadius: number;
  transition?: TransitionOption;
}

/** Upper bound on the total staggered delay entering points may add, whatever the per-point value. */
const MAX_STAGGER_TOTAL = 400;

const activeAnimations = new WeakMap<SVGGElement, () => void>();
// Point positions currently on screen, so an update slides from them even mid-tween.
const drawnPoints = new WeakMap<SVGGElement, Point[]>();

/**
 * Maps scatter data to plot-area points: `key` is the x position, `value` the y.
 * A string key is a data error here, not a band position.
 */
export function computeScatterPoints(
  data: ContinuousDatum[],
  xScale: Scale<Date | number>,
  yScale: Scale<number>,
): Point[] {
  if (data.some((d) => d.key == null)) {
    warn(
      'computeScatterPoints: datum.key is null or undefined: data must use the Datum shape { key, value }. Did you pass { x, y } instead?',
    );
  } else if (data.some((d) => typeof d.key === 'string')) {
    warn('computeScatterPoints: string keys are not supported: scatter x values must be numbers or Dates.');
  }

  return data.map((d) => ({
    x: xScale.map(d.key as Date | number),
    y: yScale.map(d.value),
  }));
}

/**
 * Draws one scatter series as point markers. Entering points grow from radius 0 at
 * their final position (staggered in x order when `stagger` is set); existing points
 * slide from their drawn position. Disabled or reduced motion paints synchronously.
 */
export function renderScatterPoints(parent: SVGGElement, points: Point[], options: ScatterRenderOptions): void {
  const motion = resolveMotion(options.transition);
  const marks = options.marks ?? [];
  const radius = options.pointRadius;

  activeAnimations.get(parent)?.();
  activeAnimations.delete(parent);

  while (parent.children.length > points.length) parent.lastChild!.remove();

  const drawn = drawnPoints.get(parent) ?? [];
  const fromRadius: number[] = [];
  const circles = points.map((_, i) => {
    let circle = parent.children[i] as SVGCircleElement | undefined;

    if (circle) {
      fromRadius.push(Number(circle.getAttribute('r')) || 0);
    } else {
      circle = createSvgElement('circle', { class: 'prism-scatter-point' });
      parent.appendChild(circle);
      fromRadius.push(0);
    }

    setAttributes(circle, { fill: options.color, opacity: marks[i]?.opacity });

    return circle;
  });

  const paint = (pts: Point[], radii: (i: number) => number): void => {
    for (const [i, circle] of circles.entries()) setAttributes(circle, { cx: pts[i].x, cy: pts[i].y, r: radii(i) });

    drawnPoints.set(parent, pts);
  };

  if (motion.duration === 0) {
    paint(points, () => radius);

    return;
  }

  const fromPts = points.map((to, i) => drawn[i] ?? to);
  // Entering points (no drawn marker yet) take their own stagger lane in x order;
  // moving points all share lane 0 so an update never crawls.
  const entering = points.map((_, i) => i).filter((i) => i >= drawn.length);
  const lanes = new Map(
    [...entering].sort((a, b) => points[a].x - points[b].x).map((pointIndex, lane) => [pointIndex, lane]),
  );
  const stagger = Math.min(motion.stagger, MAX_STAGGER_TOTAL / Math.max(1, entering.length));

  const paintFrame = (progress: (lane: number) => number): void => {
    const eased = points.map((_, i) => progress(lanes.get(i) ?? 0));

    paint(
      points.map((to, i) => ({
        x: tweenNumber(fromPts[i].x, to.x, eased[i]),
        y: tweenNumber(fromPts[i].y, to.y, eased[i]),
      })),
      (i) => tweenNumber(fromRadius[i], radius, eased[i]),
    );
  };

  // The starting state goes on screen immediately: `startTween` only paints on
  // the first frame callback, which would otherwise leave one stale frame.
  paintFrame(() => 0);

  activeAnimations.set(
    parent,
    startTween({
      count: Math.max(1, entering.length),
      duration: motion.duration,
      easing: resolveEasing(motion.easing),
      onComplete: () => {
        activeAnimations.delete(parent);
        paint(points, () => radius);
      },
      onFrame: paintFrame,
      signal: options.disposalSignal,
      stagger,
    }),
  );
}
