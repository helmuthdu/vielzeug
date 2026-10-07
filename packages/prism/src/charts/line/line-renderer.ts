import { warn } from '../../_dev';
import { resolveEasing } from '../../animation/easing';
import { resolveMotion } from '../../animation/motion';
import { tweenNumber } from '../../animation/tween';
import { computeStyleRuns, type DatumMark, hasStyledRuns, type StyleRun } from '../../core/datum-style';
import { createSvgElement, setAttributes } from '../../svg/element';
import type { Point } from '../../svg/path';
import { linePath, monotonePath, stepPath } from '../../svg/path';
import type { ContinuousDatum, Scale, TransitionConfig } from '../../types';

export interface LineRenderOptions {
  color: string;
  curve: 'linear' | 'monotone' | 'step';
  /** Aborted when the owning chart is disposed: stops the transition's `requestAnimationFrame` loop from rescheduling. */
  disposalSignal?: AbortSignal;
  /** Per-datum presentation parallel to `points`; styled runs split the line into subpaths. */
  marks?: readonly DatumMark[];
  pointRadius: number;
  showPoints: boolean;
  /** Explicit width beats the `--prism-line-width` theme token. */
  strokeWidth?: number;
  transition?: TransitionConfig;
}

const activeAnimations = new WeakMap<SVGGElement, () => void>();

function buildPath(pts: Point[], curve: LineRenderOptions['curve']): string {
  return curve === 'monotone' ? monotonePath(pts) : curve === 'step' ? stepPath(pts) : linePath(pts);
}

export function renderLine(parent: SVGGElement, points: Point[], options: LineRenderOptions): void {
  const styled = hasStyledRuns(options.marks);
  const marks = options.marks ?? [];
  const motion = resolveMotion(options.transition, 0);
  const dur = motion.duration;
  const easing = resolveEasing(motion.easing);

  let path: SVGPathElement | null = null;
  let runs: readonly StyleRun[] = [];
  let runPaths: SVGPathElement[] = [];

  if (styled) {
    runs = computeStyleRuns(marks, points.length);

    const existing = [...parent.querySelectorAll<SVGPathElement>('.prism-line-path')];

    for (const extra of existing.slice(runs.length)) extra.remove();

    runPaths = runs.map((_, r) => {
      const reuse = existing[r];

      if (reuse) return reuse;

      const created = createSvgElement('path', { class: 'prism-line-path', fill: 'none' });

      parent.appendChild(created);

      return created;
    });

    for (const [r, run] of runs.entries()) {
      setAttributes(runPaths[r], {
        opacity: run.opacity,
        stroke: options.color,
        'stroke-dasharray': run.dash,
        'stroke-width': options.strokeWidth ?? 2,
      });
      runPaths[r].style.strokeWidth = options.strokeWidth === undefined ? '' : String(options.strokeWidth);
    }
  } else {
    const existing = [...parent.querySelectorAll<SVGPathElement>('.prism-line-path')];

    path = existing[0] ?? null;

    for (const stale of existing.slice(1)) stale.remove();

    if (!path) {
      path = createSvgElement('path', { class: 'prism-line-path', fill: 'none' });
      parent.appendChild(path);
    }

    setAttributes(path, {
      opacity: undefined,
      stroke: options.color,
      'stroke-dasharray': undefined,
      'stroke-width': options.strokeWidth ?? 2,
    });
    path.style.strokeWidth = options.strokeWidth === undefined ? '' : String(options.strokeWidth);
  }

  const draw = (pts: Point[]): void => {
    if (styled) {
      for (const [r, run] of runs.entries()) {
        setAttributes(runPaths[r], { d: buildPath(pts.slice(run.start, run.end + 1), options.curve) });
      }
    } else {
      setAttributes(path!, { d: buildPath(pts, options.curve) });
    }
  };

  let dotsGroup = parent.querySelector<SVGGElement>('.prism-line-dots');

  if (options.showPoints) {
    if (!dotsGroup) {
      dotsGroup = createSvgElement('g', { class: 'prism-line-dots' });
      parent.appendChild(dotsGroup);
    }
  } else if (dotsGroup) {
    dotsGroup.remove();
    dotsGroup = null;
  }

  if (dur === 0) {
    draw(points);

    if (dotsGroup) {
      while (dotsGroup.children.length > points.length) dotsGroup.removeChild(dotsGroup.lastChild!);

      for (let i = 0; i < points.length; i++) {
        let c = dotsGroup.children[i] as SVGCircleElement | undefined;

        if (!c) {
          c = createSvgElement('circle', { class: 'prism-line-dot' });
          dotsGroup.appendChild(c);
        }

        setAttributes(c, {
          cx: points[i].x,
          cy: points[i].y,
          fill: options.color,
          opacity: marks[i]?.opacity,
          r: options.pointRadius,
        });
      }
    }

    return;
  }

  activeAnimations.get(parent)?.();

  const hasExisting = styled ? runPaths.some((p) => p.hasAttribute('d')) : !!path?.getAttribute('d');

  const fromPts: Point[] = [];
  let lastKnown: Point | null = null;

  if (dotsGroup) {
    const existingCount = dotsGroup.children.length;

    for (let i = 0; i < existingCount; i++) {
      const c = dotsGroup.children[i] as SVGCircleElement;
      const pt = { x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')) };

      fromPts.push(pt);
      lastKnown = pt;
    }

    while (dotsGroup.children.length > points.length) dotsGroup.removeChild(dotsGroup.lastChild!);

    for (let i = dotsGroup.children.length; i < points.length; i++) {
      const c = createSvgElement('circle', { class: 'prism-line-dot' });

      setAttributes(c, {
        cx: points[i].x,
        cy: points[i].y,
        fill: options.color,
        opacity: marks[i]?.opacity,
        r: options.pointRadius,
      });
      dotsGroup.appendChild(c);
    }

    for (let i = 0; i < dotsGroup.children.length; i++) {
      setAttributes(dotsGroup.children[i] as SVGCircleElement, { opacity: marks[i]?.opacity });
    }
  }

  for (let i = fromPts.length; i < points.length; i++) {
    fromPts.push(lastKnown ?? points[i]);
  }

  let startTime: number | null = null;

  function frame(ts: number) {
    if (options.disposalSignal?.aborted) {
      activeAnimations.delete(parent);

      return;
    }

    if (startTime === null) startTime = ts;

    const t = Math.min(1, (ts - startTime) / dur);
    const e = easing(t);
    const interpolated: Point[] = points.map((to, i) => {
      const from = fromPts[i] ?? to;

      return { x: tweenNumber(from.x, to.x, e), y: tweenNumber(from.y, to.y, e) };
    });

    draw(interpolated);

    if (dotsGroup) {
      for (let i = 0; i < points.length; i++) {
        const c = dotsGroup.children[i] as SVGCircleElement | undefined;

        if (c) setAttributes(c, { cx: interpolated[i].x, cy: interpolated[i].y });
      }
    }

    if (t < 1) {
      const id = requestAnimationFrame(frame);

      activeAnimations.set(parent, () => cancelAnimationFrame(id));
    } else {
      activeAnimations.delete(parent);
    }
  }

  if (!hasExisting) {
    draw(points);
  } else {
    const id = requestAnimationFrame(frame);

    activeAnimations.set(parent, () => cancelAnimationFrame(id));
  }
}

export function computePoints(data: ContinuousDatum[], xScale: Scale<Date | number>, yScale: Scale<number>): Point[] {
  if (data.some((d) => d.key == null)) {
    warn(
      'computePoints: datum.key is null or undefined: data must use the Datum shape { key, value }. Did you pass { x, y } instead?',
    );
  } else if (data.some((d) => typeof d.key === 'string')) {
    warn('computePoints: string keys are not supported for line/area charts: use numeric or Date keys.');
  }

  return data.map((d) => ({
    x: xScale.map(d.key as Date | number),
    y: yScale.map(d.value),
  }));
}
