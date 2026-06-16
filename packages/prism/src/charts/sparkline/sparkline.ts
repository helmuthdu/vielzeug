import { effect, isSignal, scope } from '@vielzeug/ripple';

import type { Point } from '../../svg/path';
import type { ChartHandle, SparklineConfig, StackSegment } from '../../types';

import { resolveEasing } from '../../animation/easing';
import { tweenNumber } from '../../animation/tween';
import { createChartBase } from '../../core/chart-base';
import { createSvgElement, setAttributes } from '../../svg/element';
import { areaPath, linePath, monotonePath, stepPath } from '../../svg/path';

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

function buildAreaPath(
  data: number[],
  width: number,
  height: number,
  curve: SparklineConfig['curve'] = 'linear',
): string {
  if (data.length === 0) return '';

  const top = buildTopPoints(data, width, height);
  const bottom = top.map((p) => ({ x: p.x, y: height }));

  return areaPath(top, bottom, curve ?? 'linear');
}

function buildPath(data: number[], width: number, height: number, curve: SparklineConfig['curve']): string {
  if (data.length === 0) return '';

  const points = buildTopPoints(data, width, height);

  return curve === 'monotone' ? monotonePath(points) : curve === 'step' ? stepPath(points) : linePath(points);
}

function renderSparkBars(
  parent: SVGGElement,
  data: number[],
  width: number,
  height: number,
  color: string,
  transition?: SparklineConfig['transition'],
): void {
  const count = data.length;
  const barW = Math.max(1, width / count - 1);
  const gap = width / count;
  const min = Math.min(0, ...data);
  const max = Math.max(...data);
  const yRange = max - min || 1;
  const dur = transition?.duration ?? 0;
  const easing = resolveEasing(transition?.easing);

  while (parent.children.length > count) {
    const last = parent.lastElementChild;

    if (last) parent.removeChild(last);
  }

  for (let i = 0; i < count; i++) {
    const finalH = Math.max(1, ((data[i] - min) / yRange) * height);
    const finalY = height - finalH;

    let rect = parent.children[i] as SVGRectElement | undefined;

    if (!rect) {
      rect = createSvgElement('rect', { class: 'prism-spark-bar' });
      parent.appendChild(rect);
    }

    setAttributes(rect, { fill: color, width: barW, x: i * gap });

    if (dur > 0 && !rect.hasAttribute('data-init')) {
      rect.setAttribute('data-init', '1');
      setAttributes(rect, { height: 0, y: height });

      let start: number | null = null;
      const from = { h: 0, y: height };
      const to = { h: finalH, y: finalY };

      const frame = (ts: number) => {
        if (start === null) start = ts;

        const t = easing(Math.min(1, (ts - start) / dur));

        setAttributes(rect!, {
          height: tweenNumber(from.h, to.h, t),
          y: tweenNumber(from.y, to.y, t),
        });

        if (t < 1) requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    } else {
      rect.setAttribute('data-init', '1');
      setAttributes(rect, { height: finalH, y: finalY });
    }
  }
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

export function createSparkline(container: HTMLElement, config: SparklineConfig): ChartHandle {
  const variant = config.variant ?? 'line';
  const color = config.color ?? 'var(--prism-color-1)';
  const curve = config.curve ?? 'linear';
  const strokeWidth = config.strokeWidth ?? 1.5;
  const fillOpacity = config.fillOpacity ?? 0.2;

  const base = createChartBase(container, {
    ...(config.ariaLabel ? { ariaLabel: config.ariaLabel } : { ariaHidden: true }),
    margin: { bottom: 0, left: 0, right: 0, top: 0 },
  });

  const { svg } = base;

  svg.classList.add('prism-sparkline');

  const innerGroup = createSvgElement('g', { class: 'prism-spark-inner' });

  svg.appendChild(innerGroup);

  let cleanupInteraction: (() => void) | undefined;

  function renderAll(): void {
    const { height: h, width: w } = base.dimensions.value;
    const data = isSignal(config.data) ? config.data.value : config.data;

    while (innerGroup.firstChild) innerGroup.removeChild(innerGroup.firstChild);

    if (data.length === 0) return;

    if (variant === 'stack' && isStackData(data)) {
      const stackGroup = createSvgElement('g', { class: 'prism-spark-stack' });

      innerGroup.appendChild(stackGroup);

      const cornerRadius = config.cornerRadius ?? 4;
      const segs = data as StackSegment[];
      const total = segs.reduce((s, d) => s + Math.max(0, d.value), 0);

      if (total > 0) {
        const half = (config.padPixels ?? 0) / 2;
        let xAcc = 0;

        segs.forEach((seg, i) => {
          const xStart = Math.round(xAcc);

          xAcc += (Math.max(0, seg.value) / total) * w;

          const xEnd = i === segs.length - 1 ? w : Math.round(xAcc);
          const isFirst = i === 0;
          const isLast = i === segs.length - 1;
          const drawX = xStart + (isFirst ? 0 : half);
          const drawW = Math.max(0, xEnd - xStart - (isFirst ? 0 : half) - (isLast ? 0 : half));
          const d = buildRoundedStackRect(drawX, 0, drawW, h, cornerRadius, isFirst, isLast);
          const path = createSvgElement('path', { class: 'prism-spark-stack-segment' });

          setAttributes(path, { d, fill: seg.color ?? defaultStackColor(i) });
          stackGroup.appendChild(path);
        });
      }
    } else if (variant === 'bar') {
      const barsGroup = createSvgElement('g', { class: 'prism-spark-bars' });

      innerGroup.appendChild(barsGroup);
      renderSparkBars(barsGroup, data as number[], w, h, color, config.transition);
    } else {
      if (variant === 'area') {
        const fill = createSvgElement('path', { class: 'prism-spark-fill' });
        const fillD = buildAreaPath(data as number[], w, h, curve);

        setAttributes(fill, { d: fillD, fill: color, 'fill-opacity': fillOpacity, stroke: 'none' });
        innerGroup.appendChild(fill);
      }

      const path = createSvgElement('path', { class: 'prism-spark-line' });
      const pathD = buildPath(data as number[], w, h, curve);

      setAttributes(path, { d: pathD, fill: 'none', stroke: color, 'stroke-width': strokeWidth });
      innerGroup.appendChild(path);
    }

    if (!isStackData(data)) attachInteraction(data as number[]);
  }

  function attachInteraction(data: number[]): void {
    cleanupInteraction?.();
    cleanupInteraction = undefined;

    if (!config.onHover && !config.onClick) return;

    if (data.length <= 1) return;

    const { width: w } = base.dimensions.value;

    svg.style.cursor = 'crosshair';

    const xStep = w / (data.length - 1);

    const handleMove = (e: MouseEvent) => {
      const rect = svg.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX / xStep)));

      config.onHover?.(idx, data[idx]);
    };

    const handleLeave = () => config.onHover?.(null, null);

    const handleClick = (e: MouseEvent) => {
      if (!config.onClick) return;

      const rect = svg.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX / xStep)));

      config.onClick(idx, data[idx]);
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

  const s = scope(() => {
    effect(
      () => {
        renderAll();
      },
      { scheduler: (run) => requestAnimationFrame(run) },
    );
  });

  return {
    dispose() {
      cleanupInteraction?.();
      s.dispose();
      base.dispose();
    },
    el: svg,
    [Symbol.dispose]() {
      this.dispose();
    },
  };
}
