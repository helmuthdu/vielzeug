import { warn } from '../../_dev';
import { createTappers } from '../../_tappers';
import { resolveEasing } from '../../animation/easing';
import { resolveMotion } from '../../animation/motion';
import { startTween } from '../../animation/transition';
import { tweenNumber } from '../../animation/tween';
import { createChartBase } from '../../core/chart-base';
import { uniqueId } from '../../core/ids';
import { PrismRenderError } from '../../errors';
import { createSvgElement, setAttributes } from '../../svg/element';
import type { Point } from '../../svg/path';
import { areaPath, linePath, monotonePath, stepPath } from '../../svg/path';
import type { ChartHandle, PrismEvent, SparklineConfig, StackSegment } from '../../types';

/** Fits the 3.5px hover marker plus its ring inside the SVG. */
const PLOT_INSET = 5;

function buildTopPoints(data: number[], width: number, height: number): Point[] {
  if (data.length === 0) return [];

  const xStep = width / Math.max(1, data.length - 1);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const yRange = max - min || 1;

  return data.map((v, i) => ({
    x: i * xStep,
    y: height - ((v - min) / yRange) * height,
  }));
}

function buildAreaPathFromPoints(top: Point[], height: number, curve: SparklineConfig['curve']): string {
  if (top.length === 0) return '';

  const bottom = top.map((p) => ({ x: p.x, y: height }));

  return areaPath(top, bottom, curve ?? 'linear');
}

function buildPathFromPoints(points: Point[], curve: SparklineConfig['curve']): string {
  if (points.length === 0) return '';

  return curve === 'monotone' ? monotonePath(points) : curve === 'step' ? stepPath(points) : linePath(points);
}

function isStackData(data: number[] | StackSegment[]): data is StackSegment[] {
  return data.length > 0 && data[0] !== null && typeof data[0] === 'object';
}

function buildRoundedStackRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  roundLeft: boolean,
  roundRight: boolean,
): string {
  const maxR = Math.min(r, w / 2, h / 2);
  const tl = roundLeft ? maxR : 0;
  const bl = roundLeft ? maxR : 0;
  const tr = roundRight ? maxR : 0;
  const br = roundRight ? maxR : 0;

  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `Q${x + w},${y} ${x + w},${y + tr}` : '',
    `V${y + h - br}`,
    br ? `Q${x + w},${y + h} ${x + w - br},${y + h}` : '',
    `H${x + bl}`,
    bl ? `Q${x},${y + h} ${x},${y + h - bl}` : '',
    `V${y + tl}`,
    tl ? `Q${x},${y} ${x + tl},${y}` : '',
    'Z',
  ]
    .filter(Boolean)
    .join('');
}

function defaultStackColor(i: number): string {
  return `var(--prism-color-${(i % 8) + 1})`;
}

export function createSparkline(
  container: HTMLElement,
  config: SparklineConfig,
): ChartHandle<number[] | StackSegment[]> {
  const variant = config.variant ?? 'line';
  const color = config.color ?? 'var(--prism-color-1)';
  const curve = config.curve ?? 'linear';
  const strokeWidth = config.strokeWidth ?? 1.5;
  const fillOpacity = config.fillOpacity;
  const showEndPoint = config.showEndPoint ?? true;
  const gradientId = uniqueId('prism-spark-fill');
  const tappers = createTappers<PrismEvent>();
  const motion = resolveMotion(config.transition);
  const easing = resolveEasing(motion.easing);
  let data = config.data;
  // Values currently on screen (mid-tween included), in data space so a resize
  // never re-animates: every variant interpolates these and repaints.
  let drawnValues: number[] | null = null;
  let activeTween: (() => void) | null = null;

  const base = createChartBase(
    container,
    {
      a11y: config.a11y,
      margin: { bottom: 0, left: 0, right: 0, top: 0 },
    },
    () => {
      tappers.emit({ height: base.dimensions.height, type: 'resize', width: base.dimensions.width });
      renderAll();
    },
  );

  const { svg } = base;

  svg.classList.add('prism-sparkline');

  const innerGroup = createSvgElement('g', { class: 'prism-spark-inner' });

  svg.appendChild(innerGroup);

  let cleanupInteraction: (() => void) | undefined;

  /** Line and area plots are inset so dots on the first and last values are not clipped. */
  function plotArea(): { h: number; inset: number; w: number } {
    const { height, width } = base.dimensions;
    const inset = variant === 'line' || variant === 'area' ? PLOT_INSET : 0;

    return { h: Math.max(1, height - inset * 2), inset, w: Math.max(1, width - inset * 2) };
  }

  /**
   * Tweens the plotted values from what is on screen to `to`, repainting through
   * `paint`. A first render (or a length change, which has no per-index
   * predecessor) grows out of `floorValue`, the scale's minimum. Unchanged values
   * — a resize re-layout, for instance — repaint without animating.
   */
  function animateValues(to: number[], floorValue: number, paint: (values: number[]) => void): void {
    activeTween?.();

    const from = drawnValues?.length === to.length ? drawnValues : to.map(() => floorValue);
    const unchanged = from.every((value, i) => value === to[i]);

    if (unchanged || motion.duration === 0) {
      drawnValues = to;
      paint(to);

      return;
    }

    activeTween = startTween({
      count: 1,
      duration: motion.duration,
      easing,
      onFrame: (progress) => {
        const e = progress(0);
        const values = to.map((value, i) => tweenNumber(from[i], value, e));

        drawnValues = values;
        paint(values);
      },
      signal: ac.signal,
    });
    // Paint the starting geometry now: the tween only paints on its first frame
    // callback, which would otherwise leave one blank frame after mount.
    drawnValues = from;
    paint(from);
  }

  function renderAll(): void {
    const { height: h, width: w } = base.dimensions;
    const plot = plotArea();

    while (innerGroup.firstChild) innerGroup.removeChild(innerGroup.firstChild);

    innerGroup.setAttribute('transform', `translate(${plot.inset},${plot.inset})`);

    if (data.length === 0) {
      drawnValues = null;

      return;
    }

    if (!isStackData(data) && data.some((v) => !Number.isFinite(v))) {
      warn('createSparkline: data contains non-finite values; they are drawn as the minimum.');
    }

    if (variant === 'stack' && isStackData(data)) {
      const stackGroup = createSvgElement('g', { class: 'prism-spark-stack' });

      innerGroup.appendChild(stackGroup);

      const cornerRadius = config.cornerRadius ?? 4;
      const segs = data as StackSegment[];
      const total = segs.reduce((s, d) => s + Math.max(0, d.value), 0);
      const paths = segs.map((seg, i) => {
        const path = createSvgElement('path', { class: 'prism-spark-stack-segment' });

        setAttributes(path, { fill: seg.color ?? defaultStackColor(i) });
        stackGroup.appendChild(path);

        return path;
      });

      if (total > 0) {
        animateValues(
          segs.map((seg) => Math.max(0, seg.value)),
          0,
          (values) => {
            const runningTotal = values.reduce((s, v) => s + v, 0) || 1;
            const half = (config.padPixels ?? 0) / 2;
            let xAcc = 0;

            values.forEach((value, i) => {
              const xStart = Math.round(xAcc);

              xAcc += (value / runningTotal) * w;

              const xEnd = i === values.length - 1 ? w : Math.round(xAcc);
              const isFirst = i === 0;
              const isLast = i === values.length - 1;
              const drawX = xStart + (isFirst ? 0 : half);
              const drawW = Math.max(0, xEnd - xStart - (isFirst ? 0 : half) - (isLast ? 0 : half));

              paths[i]?.setAttribute('d', buildRoundedStackRect(drawX, 0, drawW, h, cornerRadius, isFirst, isLast));
            });
          },
        );
      } else {
        // Nothing to draw: clear the recorded geometry so a later update cannot
        // interpolate from values that are no longer on screen.
        activeTween?.();
        drawnValues = null;
      }
    } else if (variant === 'bar') {
      const barsGroup = createSvgElement('g', { class: 'prism-spark-bars' });

      innerGroup.appendChild(barsGroup);

      const values = data as number[];
      const barMin = Math.min(0, ...values);
      const barRange = Math.max(...values) - barMin || 1;
      const barW = Math.max(1, w / values.length - 1);
      const gap = w / values.length;
      const rects = values.map(() => {
        const rect = createSvgElement('rect', { class: 'prism-spark-bar', fill: color });

        barsGroup.appendChild(rect);

        return rect;
      });

      animateValues(values, barMin, (frame) => {
        for (const [i, rect] of rects.entries()) {
          const barHeight = Math.max(1, ((frame[i] - barMin) / barRange) * h);

          setAttributes(rect, { height: barHeight, width: barW, x: i * gap, y: h - barHeight });
        }
      });
    } else {
      const values = data as number[];
      // The scale is fixed to the target values, so a tween moves points along
      // stable axes instead of wobbling as the domain follows each frame.
      const lineMin = Math.min(...values);
      const lineRange = Math.max(...values) - lineMin || 1;
      const xStep = plot.w / Math.max(1, values.length - 1);
      const pointsFromValues = (frame: number[]): Point[] =>
        frame.map((v, i) => ({ x: i * xStep, y: plot.h - ((v - lineMin) / lineRange) * plot.h }));

      let fill: SVGPathElement | null = null;

      if (variant === 'area') {
        const defs = createSvgElement('defs');
        const gradient = createSvgElement('linearGradient', { id: gradientId, x1: 0, x2: 0, y1: 0, y2: 1 });

        for (const [offset, className] of [
          [0, 'prism-spark-stop-top'],
          [1, 'prism-spark-stop-bottom'],
        ] as const) {
          const stop = createSvgElement('stop', { class: className, offset, 'stop-color': color });

          stop.style.stopColor = color;
          gradient.appendChild(stop);
        }

        defs.appendChild(gradient);
        innerGroup.appendChild(defs);

        fill = createSvgElement('path', { class: 'prism-spark-fill' });

        setAttributes(fill, { fill: `url(#${gradientId})`, stroke: 'none' });
        fill.style.fillOpacity = fillOpacity === undefined ? '' : String(fillOpacity);
        innerGroup.appendChild(fill);
      }

      const path = createSvgElement('path', { class: 'prism-spark-line' });

      setAttributes(path, { fill: 'none', stroke: color, 'stroke-width': strokeWidth });
      innerGroup.appendChild(path);

      const endDot =
        showEndPoint && values.length > 0
          ? createSvgElement('circle', { class: 'prism-spark-end', fill: color, r: 2.5 })
          : null;

      if (endDot) innerGroup.appendChild(endDot);

      animateValues(values, lineMin, (frame) => {
        const top = pointsFromValues(frame);

        setAttributes(path, { d: buildPathFromPoints(top, curve) });

        if (fill) setAttributes(fill, { d: buildAreaPathFromPoints(top, plot.h, curve) });

        const end = top.at(-1);

        if (endDot && end) setAttributes(endDot, { cx: end.x, cy: end.y });
      });
    }

    if (!isStackData(data)) attachInteraction(data as number[]);
  }

  function attachInteraction(data: number[]): void {
    cleanupInteraction?.();
    cleanupInteraction = undefined;

    if (!config.onHover && !config.onClick) return;

    if (data.length <= 1) return;

    const { h, inset, w } = plotArea();

    svg.style.cursor = 'crosshair';

    const xStep = w / (data.length - 1);
    const points = variant === 'bar' ? [] : buildTopPoints(data, w, h);
    const marker = createSvgElement('circle', { class: 'prism-spark-marker', fill: color, r: 3.5 });
    const indexAt = (clientX: number): number =>
      Math.max(0, Math.min(data.length - 1, Math.round((clientX - svg.getBoundingClientRect().left - inset) / xStep)));

    marker.style.display = 'none';
    innerGroup.appendChild(marker);

    const handleMove = (e: MouseEvent) => {
      const idx = indexAt(e.clientX);
      const point = points[idx];

      if (point) {
        setAttributes(marker, { cx: point.x, cy: point.y });
        marker.style.display = '';
      }

      config.onHover?.({ index: idx, originalEvent: e, value: data[idx] });
    };

    const handleLeave = () => {
      marker.style.display = 'none';
      config.onHover?.(null);
    };

    const handleClick = (e: MouseEvent) => {
      if (!config.onClick) return;

      const idx = indexAt(e.clientX);

      config.onClick({ index: idx, originalEvent: e, value: data[idx] });
    };

    svg.addEventListener('mousemove', handleMove);
    svg.addEventListener('mouseleave', handleLeave);
    svg.addEventListener('click', handleClick);

    cleanupInteraction = () => {
      svg.removeEventListener('mousemove', handleMove);
      svg.removeEventListener('mouseleave', handleLeave);
      svg.removeEventListener('click', handleClick);
    };
  }

  const ac = new AbortController();
  let isDisposed = false;

  try {
    renderAll();

    return {
      get disposalSignal(): AbortSignal {
        return ac.signal;
      },

      dispose() {
        if (isDisposed) return;

        isDisposed = true;
        tappers.emit({ type: 'dispose' });
        tappers.stop();
        ac.abort();
        cleanupInteraction?.();
        base.dispose();
      },

      get disposed(): boolean {
        return isDisposed;
      },

      el: svg,

      tap: tappers.tap,

      update(next) {
        if (isDisposed) throw new PrismRenderError('Cannot update a disposed chart.');
        data = next;
        renderAll();
      },

      [Symbol.dispose]() {
        this.dispose();
      },
    };
  } catch (error) {
    ac.abort();
    cleanupInteraction?.();
    base.dispose();
    throw error instanceof PrismRenderError ? error : new PrismRenderError('Failed to render chart.', { cause: error });
  }
}
