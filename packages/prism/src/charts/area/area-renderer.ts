import { warn } from '../../_dev';
import { resolveEasing } from '../../animation/easing';
import { resolveMotion } from '../../animation/motion';
import { tweenNumber } from '../../animation/tween';
import { computeStyleRuns, type DatumMark, hasStyledRuns, type StyleRun } from '../../core/datum-style';
import { uniqueId } from '../../core/ids';
import { createSvgElement, setAttributes } from '../../svg/element';
import type { Point } from '../../svg/path';
import { areaPath, linePath, monotonePath, stepPath } from '../../svg/path';
import type { ContinuousDatum, Scale, TransitionConfig } from '../../types';

export interface AreaRenderOptions {
  color: string;
  curve: 'linear' | 'monotone' | 'step';
  /** Aborted when the owning chart is disposed: stops the transition's `requestAnimationFrame` loop from rescheduling. */
  disposalSignal?: AbortSignal;
  fill: 'gradient' | 'solid';
  /** Explicit opacity beats the `--prism-area-opacity` theme token. */
  fillOpacity?: number;
  /** Per-datum presentation parallel to `points`; styled runs split the top line into subpaths. */
  marks?: readonly DatumMark[];
  showLine: boolean;
  transition?: TransitionConfig;
}

const activeAreaAnimations = new WeakMap<SVGGElement, () => void>();
const previousPoints = new WeakMap<SVGGElement, Point[]>();

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
  const motion = resolveMotion(options.transition, 0);
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
    const bottomPoints = points.map((p) => ({ x: p.x, y: baselineY }));

    setAttributes(fill, { d: areaPath(points, bottomPoints, options.curve) });

    drawLine(points);

    return;
  }

  activeAreaAnimations.get(parent)?.();

  const hasExisting = fill.hasAttribute('d');

  if (!hasExisting) {
    const bottomPoints = points.map((p) => ({ x: p.x, y: baselineY }));

    setAttributes(fill, { d: areaPath(points, bottomPoints, options.curve) });

    drawLine(points);

    previousPoints.set(parent, points);

    return;
  }

  const rawFrom = previousPoints.get(parent) ?? points;
  const fromPoints: Point[] = points.map((_, i) => rawFrom[i] ?? rawFrom[rawFrom.length - 1] ?? points[i]);

  let startTime: number | null = null;

  function frame(ts: number) {
    if (options.disposalSignal?.aborted) {
      activeAreaAnimations.delete(parent);

      return;
    }

    if (startTime === null) startTime = ts;

    const t = Math.min(1, (ts - startTime) / dur);
    const e = easing(t);
    const interpolated: Point[] = points.map((to, i) => ({
      x: tweenNumber(fromPoints[i].x, to.x, e),
      y: tweenNumber(fromPoints[i].y, to.y, e),
    }));
    const interpolatedBottom = interpolated.map((p) => ({ x: p.x, y: baselineY }));

    setAttributes(fill!, { d: areaPath(interpolated, interpolatedBottom, options.curve) });

    drawLine(interpolated);

    if (t < 1) {
      const id = requestAnimationFrame(frame);

      activeAreaAnimations.set(parent, () => cancelAnimationFrame(id));
    } else {
      activeAreaAnimations.delete(parent);
      previousPoints.set(parent, points);
    }
  }

  previousPoints.set(parent, fromPoints);

  const id = requestAnimationFrame(frame);

  activeAreaAnimations.set(parent, () => cancelAnimationFrame(id));
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
