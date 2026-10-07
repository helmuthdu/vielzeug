import { warn } from '../../_dev';
import { resolveEasing } from '../../animation/easing';
import { resolveMotion } from '../../animation/motion';
import { cancelReveal, playReveal, SERIES_REVEAL_STAGGER } from '../../animation/reveal';
import { startTween } from '../../animation/transition';
import { tweenNumber } from '../../animation/tween';
import { computeStyleRuns, type DatumMark, hasStyledRuns, type StyleRun } from '../../core/datum-style';
import { uniqueId } from '../../core/ids';
import { createSvgElement, setAttributes } from '../../svg/element';
import type { Point } from '../../svg/path';
import { areaPath, linePath, monotonePath, stepPath } from '../../svg/path';
import type { ContinuousDatum, Scale, TransitionOption } from '../../types';

export interface AreaRenderOptions {
  /** Plot-area size in area-local coordinates: the mount wipe sweeps across this box. */
  bounds: { height: number; width: number };
  color: string;
  curve: 'linear' | 'monotone' | 'step';
  /** Aborted when the owning chart is disposed: stops the transition's `requestAnimationFrame` loop from rescheduling. */
  disposalSignal?: AbortSignal;
  fill: 'gradient' | 'solid';
  /** Explicit opacity beats the `--prism-area-opacity` theme token. */
  fillOpacity?: number;
  /** Per-datum presentation parallel to `points`; styled runs split the top line into subpaths. */
  marks?: readonly DatumMark[];
  /** Series position: multi-series mounts stagger by this index so they do not wipe in lockstep. */
  seriesIndex?: number;
  showLine: boolean;
  transition?: TransitionOption;
}

const activeAreaAnimations = new WeakMap<SVGGElement, () => void>();
const drawnPoints = new WeakMap<SVGGElement, Point[]>();

function buildLinePath(pts: Point[], curve: AreaRenderOptions['curve']): string {
  return curve === 'monotone' ? monotonePath(pts) : curve === 'step' ? stepPath(pts) : linePath(pts);
}

/** A vertical gradient fading to transparent at the baseline, or a flat fill. */
function applyAreaFill(parent: SVGGElement, fill: SVGPathElement, options: AreaRenderOptions): void {
  let gradient = parent.querySelector<SVGLinearGradientElement>('linearGradient');

  if (options.fill === 'gradient') {
    if (!gradient) {
      const defs = createSvgElement('defs');

      gradient = createSvgElement('linearGradient', { id: uniqueId('prism-area-fill'), x1: 0, x2: 0, y1: 0, y2: 1 });
      gradient.append(
        createSvgElement('stop', { class: 'prism-area-stop-top', offset: 0 }),
        createSvgElement('stop', { class: 'prism-area-stop-bottom', offset: 1 }),
      );
      defs.appendChild(gradient);
      parent.insertBefore(defs, parent.firstChild);
    }

    for (const stop of gradient.querySelectorAll('stop')) {
      stop.setAttribute('stop-color', options.color);
      stop.style.stopColor = options.color;
    }

    setAttributes(fill, { fill: `url(#${gradient.id})` });
  } else {
    gradient?.parentElement?.remove();
    setAttributes(fill, { fill: options.color });
  }

  setAttributes(fill, { class: `prism-area-fill prism-area-fill--${options.fill}`, stroke: 'none' });
  fill.style.fillOpacity = options.fillOpacity === undefined ? '' : String(options.fillOpacity);
}

export function renderArea(parent: SVGGElement, points: Point[], baselineY: number, options: AreaRenderOptions): void {
  const motion = resolveMotion(options.transition);
  const dur = motion.duration;
  const easing = resolveEasing(motion.easing);

  let fill = parent.querySelector<SVGPathElement>('.prism-area-fill');

  if (!fill) {
    fill = createSvgElement('path', { class: 'prism-area-fill' });
    parent.appendChild(fill);
  }

  applyAreaFill(parent, fill, options);

  let line: SVGPathElement | null = null;
  let runs: readonly StyleRun[] = [];
  let lines: SVGPathElement[] = [];
  const styled = hasStyledRuns(options.marks);
  const marks = options.marks ?? [];

  if (options.showLine) {
    if (styled) {
      runs = computeStyleRuns(marks, points.length);

      const existing = [...parent.querySelectorAll<SVGPathElement>('.prism-area-line')];

      for (const extra of existing.slice(runs.length)) extra.remove();

      lines = runs.map((_, r) => {
        const reuse = existing[r];

        if (reuse) return reuse;

        const created = createSvgElement('path', { class: 'prism-area-line', fill: 'none' });

        parent.appendChild(created);

        return created;
      });

      for (const [r, run] of runs.entries()) {
        setAttributes(lines[r], {
          opacity: run.opacity,
          stroke: options.color,
          'stroke-dasharray': run.dash,
          'stroke-width': 2,
        });
      }

      line = null;
    } else {
      const existing = [...parent.querySelectorAll<SVGPathElement>('.prism-area-line')];

      for (const stale of existing.slice(1)) stale.remove();

      line = existing[0] ?? null;

      if (!line) {
        line = createSvgElement('path', { class: 'prism-area-line', fill: 'none' });
        parent.appendChild(line);
      }

      setAttributes(line, {
        opacity: undefined,
        stroke: options.color,
        'stroke-dasharray': undefined,
        'stroke-width': 2,
      });
    }
  } else {
    for (const stale of parent.querySelectorAll('.prism-area-line')) stale.remove();
  }

  const drawLine = (pts: Point[]): void => {
    if (!options.showLine) return;

    if (styled) {
      for (const [r, run] of runs.entries()) {
        setAttributes(lines[r], { d: buildLinePath(pts.slice(run.start, run.end + 1), options.curve) });
      }
    } else if (line) {
      setAttributes(line, { d: buildLinePath(pts, options.curve) });
    }
  };

  if (dur === 0) {
    cancelReveal(parent);
    const bottomPoints = points.map((p) => ({ x: p.x, y: baselineY }));

    setAttributes(fill, { d: areaPath(points, bottomPoints, options.curve) });

    drawLine(points);
    drawnPoints.set(parent, points);

    return;
  }

  activeAreaAnimations.get(parent)?.();
  cancelReveal(parent);

  const drawArea = (pts: Point[]): void => {
    setAttributes(fill!, {
      d: areaPath(
        pts,
        pts.map((p) => ({ x: p.x, y: baselineY })),
        options.curve,
      ),
    });
  };

  if (!drawnPoints.has(parent)) {
    // A first render has no drawn shape to interpolate from: the final area is
    // painted once and wiped in left to right, so the fill never inflates.
    playReveal(
      parent,
      options.bounds,
      () => {
        drawArea(points);
        drawLine(points);
        drawnPoints.set(parent, points);
      },
      motion,
      {
        delay: (options.seriesIndex ?? 0) * SERIES_REVEAL_STAGGER,
        signal: options.disposalSignal,
      },
    );
    // The reveal owns the mount: the update tween below would replay it from the baseline.
    return;
  }

  const rawFrom: Point[] = drawnPoints.get(parent) ?? points;
  const fromPoints: Point[] = points.map((_, i) => rawFrom[i] ?? rawFrom[rawFrom.length - 1] ?? points[i]);

  const paintFrame = (e: number): void => {
    const interpolated: Point[] = points.map((to, i) => ({
      x: tweenNumber(fromPoints[i].x, to.x, e),
      y: tweenNumber(fromPoints[i].y, to.y, e),
    }));

    drawnPoints.set(parent, interpolated);
    drawArea(interpolated);
    drawLine(interpolated);
  };

  // The starting geometry goes on screen immediately: `startTween` only paints on
  // the first frame callback, which would otherwise leave one blank frame.
  paintFrame(0);

  activeAreaAnimations.set(
    parent,
    startTween({
      count: 1,
      duration: dur,
      easing,
      onComplete: () => {
        activeAreaAnimations.delete(parent);
        drawnPoints.set(parent, points);
      },
      onFrame: (progress) => paintFrame(progress(0)),
      signal: options.disposalSignal,
    }),
  );
}

export function computeAreaPoints(
  data: ContinuousDatum[],
  xScale: Scale<Date | number>,
  yScale: Scale<number>,
): Point[] {
  if (data.some((d) => d.key == null)) {
    warn(
      'computeAreaPoints: datum.key is null or undefined: data must use the Datum shape { key, value }. Did you pass { x, y } instead?',
    );
  } else if (data.some((d) => typeof d.key === 'string')) {
    warn('computeAreaPoints: string keys are not supported for line/area charts: use numeric or Date keys.');
  }

  return data.map((d) => ({
    x: xScale.map(d.key as Date | number),
    y: yScale.map(d.value),
  }));
}
