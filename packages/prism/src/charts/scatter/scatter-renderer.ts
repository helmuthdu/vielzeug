import { warn } from '../../_dev';
import { resolveEasing } from '../../animation/easing';
import { resolveMotion } from '../../animation/motion';
import { cancelReveal, playReveal, SERIES_REVEAL_STAGGER } from '../../animation/reveal';
import { startTween } from '../../animation/transition';
import { tweenNumber } from '../../animation/tween';
import type { DatumMark } from '../../core/datum-style';
import { createSvgElement, setAttributes } from '../../svg/element';
import type { Point } from '../../svg/path';
import type { ContinuousDatum, Scale, TransitionOption } from '../../types';

export interface ScatterRenderOptions {
  /** Plot-area size in area-local coordinates: the mount wipe sweeps across this box. */
  bounds: { height: number; width: number };
  color: string;
  /** Aborted when the owning chart is disposed: stops the transition's `requestAnimationFrame` loop from rescheduling. */
  disposalSignal?: AbortSignal;
  /** Per-datum presentation parallel to `points`; `opacity` fades an overlapping marker. */
  marks?: readonly DatumMark[];
  /** Default 3; an explicit value overrides the `--prism-point-radius` default. */
  pointRadius?: number;
  /** Series position: multi-series mounts stagger by this index so they do not wipe in lockstep. */
  seriesIndex?: number;
  transition?: TransitionOption;
}

const activeAnimations = new WeakMap<SVGGElement, () => void>();
// Point positions currently on screen, so an update slides from them even mid-tween.
const drawnPoints = new WeakMap<SVGGElement, Point[]>();

/**
 * Maps scatter data to screen points: `key` is the x position, `value` the y.
 * Scatter keeps its own mapper (rather than reusing the line renderer's) because
 * a scatter point is an independent pair, so a string category key is a data
 * error here rather than a supported band position.
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
    warn('computeScatterPoints: string keys are not supported: scatter x values must be numeric or Date.');
  }

  return data.map((d) => ({
    x: xScale.map(d.key as Date | number),
    y: yScale.map(d.value),
  }));
}

/**
 * Draws one scatter series as point markers. Mount paints the finished points and
 * wipes them in left to right (the same non-deforming reveal line/area use); an
 * update slides every point from its drawn position to the new one.
 */
export function renderScatterPoints(parent: SVGGElement, points: Point[], options: ScatterRenderOptions): void {
  const motion = resolveMotion(options.transition);
  const dur = motion.duration;
  const easing = resolveEasing(motion.easing);
  const radius = options.pointRadius ?? 3;
  const marks = options.marks ?? [];

  const draw = (pts: Point[]): void => {
    while (parent.children.length > pts.length) parent.removeChild(parent.lastChild!);

    for (const [i, point] of pts.entries()) {
      let circle = parent.children[i] as SVGCircleElement | undefined;

      if (!circle) {
        circle = createSvgElement('circle', { class: 'prism-scatter-point' });
        parent.appendChild(circle);
      }

      setAttributes(circle, {
        cx: point.x,
        cy: point.y,
        fill: options.color,
        opacity: marks[i]?.opacity,
        r: radius,
      });
    }
  };

  if (dur === 0) {
    cancelReveal(parent);
    draw(points);
    drawnPoints.set(parent, points);

    return;
  }

  activeAnimations.get(parent)?.();
  cancelReveal(parent);

  const isMount = !drawnPoints.has(parent);

  if (isMount) {
    // A first render has no drawn points to slide from: the finished markers are
    // painted once and wiped in left to right, drifting up as they appear.
    playReveal(
      parent,
      options.bounds,
      () => {
        draw(points);
        drawnPoints.set(parent, points);
      },
      motion,
      {
        delay: (options.seriesIndex ?? 0) * SERIES_REVEAL_STAGGER,
        settle: true,
        signal: options.disposalSignal,
      },
    );

    return;
  }

  const fromPts: Point[] = [];
  const drawn = drawnPoints.get(parent) ?? points;

  for (const [i, to] of points.entries()) {
    fromPts.push(drawn[i] ?? drawn.at(-1) ?? to);
  }

  const paintFrame = (e: number): void => {
    const interpolated: Point[] = points.map((to, i) => {
      const from = fromPts[i] ?? to;

      return { x: tweenNumber(from.x, to.x, e), y: tweenNumber(from.y, to.y, e) };
    });

    drawnPoints.set(parent, interpolated);
    draw(interpolated);
  };

  // The starting geometry goes on screen immediately: `startTween` only paints on
  // the first frame callback, which would otherwise leave one blank frame.
  paintFrame(0);

  activeAnimations.set(
    parent,
    startTween({
      count: 1,
      duration: dur,
      easing,
      onComplete: () => {
        activeAnimations.delete(parent);
        drawnPoints.set(parent, points);
      },
      onFrame: (progress) => paintFrame(progress(0)),
      signal: options.disposalSignal,
    }),
  );
}
