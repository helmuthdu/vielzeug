import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAreaChart } from '../charts/area';
import { createBarChart } from '../charts/bar';
import { createLineChart } from '../charts/line';
import { createPieChart } from '../charts/pie';
import { createSparkline } from '../charts/sparkline';

/**
 * Chart-level motion behavior: what animates by default, how each chart enters,
 * and how `transition: false` opts out. Frame callbacks are driven by hand so the
 * assertions land on exact tween progress instead of wall-clock timing.
 */

/** Collects rAF callbacks so a test can advance a tween to an exact timestamp. */
function driveFrames(): FrameRequestCallback[] {
  const frames: FrameRequestCallback[] = [];

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    frames.push(cb);

    return frames.length;
  });

  return frames;
}

/** Y coordinates in a `M0,116L265,0…` path, used to compare drawn geometry. */
function pathYs(d: string | null): number[] {
  return [...(d ?? '').matchAll(/M?[\d.-]+,([\d.-]+)/g)].map((m) => Number(m[1]));
}

/** Remaining normalized length of a line's entrance trace. */
function traceOffsetFor(root: Element, group: Element): number {
  const id = group.getAttribute('mask')?.match(/#(.+)\)/)?.[1];

  return Number(root.querySelector(`mask#${CSS.escape(id ?? '')} path`)?.getAttribute('stroke-dashoffset'));
}

const LINE_SERIES = [
  {
    data: [
      { key: 1, value: 10 },
      { key: 2, value: 20 },
    ],
    name: 'S',
  },
];
const BARS = [
  {
    data: [
      { key: 'A', value: 10 },
      { key: 'B', value: 20 },
    ],
    name: 'S',
  },
];
const SLICES = [
  { label: 'A', value: 30 },
  { label: 'B', value: 50 },
  { label: 'C', value: 20 },
];

describe('motion is on by default', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 300, width: 600, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['grouped', 'grouped-horizontal'] as const)(
    '%s bars reserve the legend before growing from their stationary baseline',
    (variant) => {
      const frames = driveFrames();
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
        return this.classList.contains('prism-legend') ? 30 : 0;
      });
      const chart = createBarChart(container, { legend: true, series: BARS, variant });
      const bar = chart.el.querySelector('.prism-bar')!;
      const clip = chart.el.querySelector('clipPath rect')!;
      const horizontal = variant === 'grouped-horizontal';
      const dimension = horizontal ? 'width' : 'height';
      const position = horizontal ? 'x' : 'y';
      const geometry = bar.outerHTML;

      expect(chart.el.getAttribute('height')).toBe('270');
      expect(Number(clip.getAttribute(dimension))).toBe(0);
      const baseline = horizontal
        ? Number(bar.getAttribute('x'))
        : Number(bar.getAttribute('y')) + Number(bar.getAttribute('height'));

      frames.shift()?.(0);
      frames.shift()?.(150);
      expect(Number(clip.getAttribute(dimension))).toBeGreaterThan(0);
      expect(Number(clip.getAttribute(dimension))).toBeLessThan(Number(bar.getAttribute(dimension)));
      expect(
        horizontal
          ? Number(clip.getAttribute(position))
          : Number(clip.getAttribute(position)) + Number(clip.getAttribute(dimension)),
      ).toBeCloseTo(baseline);
      expect(bar.outerHTML).toBe(geometry);
      chart.dispose();
    },
  );

  it('lines with a legend trace at their final layout instead of moving upward', () => {
    const frames = driveFrames();
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
      return this.classList.contains('prism-legend') ? 30 : 0;
    });
    const chart = createLineChart(container, { legend: true, series: LINE_SERIES });
    const path = chart.el.querySelector('.prism-line-path')!;
    const geometry = path.getAttribute('d');

    expect(chart.el.getAttribute('height')).toBe('270');
    frames.shift()?.(0);
    frames.shift()?.(200);
    expect(path.getAttribute('d')).toBe(geometry);
    expect(traceOffsetFor(chart.el, chart.el.querySelector('.prism-line-series')!)).toBeLessThan(1);
    chart.dispose();
  });

  it('the first resize notification preserves a legend-aware line entrance', () => {
    const frames = driveFrames();
    let notify: ResizeObserverCallback | undefined;

    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function () {
      return this.classList.contains('prism-legend') ? 30 : 0;
    });
    const chart = createLineChart(container, { legend: true, series: LINE_SERIES });
    const series = chart.el.querySelector('.prism-line-series')!;
    const mask = series.getAttribute('mask');
    const geometry = chart.el.querySelector('.prism-line-path')?.getAttribute('d');

    notify?.([{ contentRect: { height: 300, width: 600 } } as ResizeObserverEntry], {} as ResizeObserver);
    frames.shift()?.(0);
    frames.shift()?.(0);
    frames.shift()?.(100);
    expect(series.getAttribute('mask')).toBe(mask);
    expect(chart.el.querySelector('.prism-line-path')?.getAttribute('d')).toBe(geometry);
    expect(chart.el.getAttribute('height')).toBe('270');
    chart.dispose();
  });

  it.each(['line', 'grouped', 'grouped-horizontal'] as const)(
    '%s applies a page-load size change immediately instead of sliding the geometry',
    (kind) => {
      const pending = new Map<number, FrameRequestCallback>();
      let nextId = 0;
      let notify: ResizeObserverCallback | undefined;

      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
        pending.set(++nextId, cb);
        return nextId;
      });
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
        pending.delete(id);
      });
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: ResizeObserverCallback) {
            notify = callback;
          }
          observe() {}
          disconnect() {}
          unobserve() {}
        },
      );
      const chart =
        kind === 'line'
          ? createLineChart(container, { series: LINE_SERIES })
          : createBarChart(container, { series: BARS, variant: kind });
      const step = (time: number) => {
        const callbacks = [...pending.values()];
        pending.clear();
        for (const callback of callbacks) callback(time);
      };

      step(0);
      notify?.([{ contentRect: { height: 240, width: 500 } } as ResizeObserverEntry], {} as ResizeObserver);
      step(100);
      expect(chart.el.getAttribute('viewBox')).toBe('0 0 500 240');
      expect(chart.el.querySelector('mask, clipPath')).toBeNull();
      expect(pending.size).toBe(0);

      const referenceHost = document.createElement('div');
      Object.defineProperty(referenceHost, 'getBoundingClientRect', {
        value: () => ({ height: 240, width: 500, x: 0, y: 0 }),
      });
      container.appendChild(referenceHost);
      const reference =
        kind === 'line'
          ? createLineChart(referenceHost, { series: LINE_SERIES, transition: false })
          : createBarChart(referenceHost, { series: BARS, transition: false, variant: kind });
      const geometry = (svg: SVGSVGElement) =>
        [...svg.querySelectorAll('.prism-line-path, .prism-bar')].map((el) =>
          ['d', 'x', 'y', 'width', 'height'].map((attr) => el.getAttribute(attr)),
        );

      expect(geometry(chart.el)).toEqual(geometry(reference.el));
      chart.dispose();
      reference.dispose();
    },
  );

  it('bar charts reveal the finished bars from the baseline without any transition config', () => {
    const frames = driveFrames();
    const chart = createBarChart(container, { series: BARS, transition: { duration: 300 } });
    const bar = chart.el.querySelector('.prism-bar')!;
    const series = chart.el.querySelector('.prism-bar-series')!;

    // The bar is painted at its final height immediately — a grow reveal never
    // renders the corner-clamped sliver frames of a height tween — and a per-bar
    // clip rect hides it until the frames run.
    expect(Number(bar.getAttribute('height'))).toBeGreaterThan(0);
    expect(series.getAttribute('clip-path')).toMatch(/^url\(#prism-reveal-/);

    const clipRects = () => {
      const id = series.getAttribute('clip-path')?.match(/#(.+)\)/)?.[1];

      return [...chart.el.querySelectorAll(`clipPath#${CSS.escape(id ?? '')} rect`)] as SVGRectElement[];
    };
    const barTop = Number(bar.getAttribute('y'));
    const baseline = barTop + Number(bar.getAttribute('height'));

    expect(Number(clipRects()[0]?.getAttribute('height'))).toBe(0);

    frames.shift()?.(0);
    frames.shift()?.(150);

    // Mid-flight: the first bar's clip has grown up from the baseline toward its top.
    const mid = clipRects()[0];

    expect(Number(mid?.getAttribute('height'))).toBeGreaterThan(0);
    expect(Number(mid?.getAttribute('y'))).toBeLessThan(baseline);
    const bars = [...chart.el.querySelectorAll('.prism-bar')];
    const progress = clipRects().map(
      (rect, i) => Number(rect.getAttribute('height')) / Number(bars[i].getAttribute('height')),
    );

    expect(progress[0]).toBeCloseTo(progress[1]);

    frames.shift()?.(1_000);

    // At completion the clip has covered the full bar and torn itself down.
    expect(series.hasAttribute('clip-path')).toBe(false);
    chart.dispose();
  });

  it('transition: false renders bars at their final geometry synchronously', () => {
    driveFrames();
    const chart = createBarChart(container, { series: BARS, transition: false });

    expect(Number(chart.el.querySelector('.prism-bar')?.getAttribute('height'))).toBeGreaterThan(0);
    chart.dispose();
  });

  it('line charts trace the final geometry without fading, drifting, or deforming it', () => {
    const frames = driveFrames();
    const chart = createLineChart(container, { series: LINE_SERIES });
    const path = chart.el.querySelector('.prism-line-path')!;

    const mountYs = pathYs(path.getAttribute('d'));

    expect(mountYs[0]).not.toBe(mountYs[1]);

    const series = chart.el.querySelector('.prism-line-series')!;

    expect(series.getAttribute('mask')).toMatch(/^url\(#prism-trace-/);
    expect(traceOffsetFor(chart.el, series)).toBe(1);
    expect(series.hasAttribute('clip-path')).toBe(false);
    expect(series.hasAttribute('opacity')).toBe(false);
    expect(series.hasAttribute('transform')).toBe(false);

    frames.shift()?.(0);
    frames.shift()?.(210);
    expect(traceOffsetFor(chart.el, series)).toBeGreaterThan(0);
    expect(traceOffsetFor(chart.el, series)).toBeLessThan(1);
    frames.shift()?.(1_000);

    expect(series.hasAttribute('mask')).toBe(false);
    expect(series.querySelector('defs')).toBeNull();
    expect(pathYs(path.getAttribute('d'))[0]).toBe(mountYs[0]);
    chart.dispose();
  });

  it('area charts grow from the baseline to the final fill on mount', () => {
    const frames = driveFrames();
    const chart = createAreaChart(container, { series: LINE_SERIES });
    const fill = chart.el.querySelector('.prism-area-fill')!;

    const initial = fill.getAttribute('d');
    expect(new Set(pathYs(initial)).size).toBe(1);

    frames.shift()?.(0);
    frames.shift()?.(150);
    const intermediate = fill.getAttribute('d');
    expect(intermediate).not.toBe(initial);
    expect(new Set(pathYs(intermediate)).size).toBeGreaterThan(1);
    frames.shift()?.(1_000);

    expect(fill.getAttribute('d')).not.toBe(intermediate);
    expect(new Set(pathYs(fill.getAttribute('d'))).size).toBeGreaterThan(1);
    chart.dispose();
  });

  it('an update during a line trace removes the mask and morphs from the final shape', () => {
    const frames = driveFrames();
    const chart = createLineChart(container, { series: LINE_SERIES, transition: { duration: 100 } });
    const series = chart.el.querySelector('.prism-line-series')!;

    frames.shift()?.(0);

    chart.update([
      {
        data: [
          { key: 1, value: 20 },
          { key: 2, value: 10 },
        ],
        name: 'S',
      },
    ]);

    expect(series.hasAttribute('mask')).toBe(false);
    expect(series.querySelector('defs')).toBeNull();

    frames.shift()?.(0);
    frames.shift()?.(1_000);
    chart.dispose();
  });

  it('multi-series lines trace together without an entrance delay', () => {
    const frames = driveFrames();
    const chart = createLineChart(container, {
      series: [
        LINE_SERIES[0],
        {
          data: [
            { key: 1, value: 20 },
            { key: 2, value: 10 },
          ],
          name: 'T',
        },
      ],
      transition: { duration: 100 },
    });
    const [first, second] = [...chart.el.querySelectorAll('.prism-line-series')];

    frames.shift()?.(0);
    frames.shift()?.(0);
    frames.shift()?.(30);
    frames.shift()?.(30);

    expect(traceOffsetFor(chart.el, first)).toBeLessThan(1);
    expect(traceOffsetFor(chart.el, second)).toBe(traceOffsetFor(chart.el, first));

    frames.shift()?.(1_000);
    chart.dispose();
  });

  it('the line trace preserves dashed styling and uncovers fixed-position markers', () => {
    const frames = driveFrames();
    const chart = createLineChart(container, {
      series: [{ ...LINE_SERIES[0], data: LINE_SERIES[0].data.map((d) => ({ ...d, dash: '4 2' })), showPoints: true }],
    });
    const series = chart.el.querySelector('.prism-line-series')!;
    const path = series.querySelector('.prism-line-path')!;
    const dots = [...series.querySelectorAll('.prism-line-dot')];
    const positions = dots.map((dot) => [dot.getAttribute('cx'), dot.getAttribute('cy')]);

    expect(path.getAttribute('stroke-dasharray')).toBe('4 2');
    expect(series.querySelector('mask path')?.getAttribute('d')).toBe(path.getAttribute('d'));
    expect(Number(series.querySelector('mask path')?.getAttribute('stroke-width'))).toBeGreaterThan(6);
    frames.shift()?.(0);
    frames.shift()?.(210);
    expect(path.getAttribute('stroke-dasharray')).toBe('4 2');
    expect(dots.map((dot) => [dot.getAttribute('cx'), dot.getAttribute('cy')])).toEqual(positions);
    chart.dispose();
    expect(series.hasAttribute('mask')).toBe(false);
  });

  it('reduced motion renders lines immediately without a mask or animation frames', () => {
    const frames = driveFrames();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    try {
      const chart = createLineChart(container, { series: LINE_SERIES });

      expect(chart.el.querySelector('mask')).toBeNull();
      expect(frames).toHaveLength(0);
      expect(chart.el.querySelector('.prism-line-path')?.getAttribute('d')).toBeTruthy();
      chart.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('traces each styled curved segment using its exact rendered geometry in sequence', () => {
    const frames = driveFrames();
    const chart = createLineChart(container, {
      series: [
        {
          curve: 'monotone',
          data: [
            { key: 0, value: 5 },
            { key: 1, value: 22 },
            { dash: '4 2', key: 2, value: 9 },
            { dash: '4 2', key: 3, value: 30 },
            { key: 4, value: 14 },
          ],
          name: 'S',
          showPoints: true,
        },
      ],
      transition: { duration: 400, easing: 'linear' },
    });
    const paths = [...chart.el.querySelectorAll('.prism-line-path')];
    const traces = [...chart.el.querySelectorAll('mask path')];

    expect(traces.map((trace) => trace.getAttribute('d'))).toEqual(paths.map((path) => path.getAttribute('d')));
    frames.shift()?.(0);
    frames.shift()?.(100);
    expect(Number(traces[0].getAttribute('stroke-dashoffset'))).toBeCloseTo(0.5);
    expect(Number(traces[1].getAttribute('stroke-dashoffset'))).toBe(1);
    frames.shift()?.(300);
    expect(Number(traces[0].getAttribute('stroke-dashoffset'))).toBe(0);
    expect(Number(traces[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(0.5);
    chart.dispose();
  });

  it('pie charts morph slice angles on update instead of replaying the mount sweep', () => {
    const frames = driveFrames();
    const chart = createPieChart(container, { data: SLICES, transition: { duration: 100 } });

    // Let the mount sweep finish so the update starts from a full ring.
    for (let i = 0; i < 5 && frames.length > 0; i++) frames.shift()?.(i * 100);

    const before = chart.el.querySelector('.prism-pie-slice')?.getAttribute('d');

    chart.update([
      { label: 'A', value: 10 },
      { label: 'B', value: 60 },
      { label: 'C', value: 30 },
    ]);

    const firstFrame = frames.shift();

    expect(firstFrame, 'the update must schedule a tween frame').toBeDefined();

    // A morph starts on the geometry that is already on screen; a re-sweep would
    // have collapsed the slice to an empty path here.
    firstFrame?.(0);
    expect(chart.el.querySelector('.prism-pie-slice')?.getAttribute('d')).toBe(before);

    firstFrame?.(1_000);
    expect(chart.el.querySelector('.prism-pie-slice')?.getAttribute('d')).not.toBe(before);
    chart.dispose();
  });

  it('sparklines tween a data update instead of snapping', () => {
    const frames = driveFrames();
    const chart = createSparkline(container, { data: [1, 2, 3], transition: { duration: 100 } });
    // A sparkline rebuilds its plot nodes per render, so the node has to be
    // re-queried after every update.
    const lineD = () => chart.el.querySelector('.prism-spark-line')?.getAttribute('d');

    for (let i = 0; i < 5 && frames.length > 0; i++) frames.shift()?.(i * 100);

    const settled = lineD();

    chart.update([3, 2, 1]);

    expect(lineD()).toBe(settled);

    // The first frame anchors the tween's start time; progress shows on the next.
    frames.shift()?.(0);
    frames.shift()?.(50);

    expect(lineD()).not.toBe(settled);

    frames.shift()?.(1_000);

    expect(lineD()).not.toBe(settled);
    chart.dispose();
  });

  it('sparkline updates with unchanged values repaint without animating', () => {
    const frames = driveFrames();
    const chart = createSparkline(container, { data: [1, 2, 3], transition: { duration: 100 } });

    for (let i = 0; i < 5 && frames.length > 0; i++) frames.shift()?.(i * 100);

    const settled = chart.el.querySelector('.prism-spark-line')?.getAttribute('d');

    frames.length = 0;
    // A re-layout with the same values (a resize repaints through the same path)
    // must not schedule a tween: nothing moved, so nothing should animate.
    chart.update([1, 2, 3]);

    expect(chart.el.querySelector('.prism-spark-line')?.getAttribute('d')).toBe(settled);
    expect(frames).toHaveLength(0);
    chart.dispose();
  });

  it('bar stagger stays bounded so a long category axis does not crawl', () => {
    const frames = driveFrames();
    const data = Array.from({ length: 30 }, (_, i) => ({ key: `k${i}`, value: i + 1 }));
    const chart = createBarChart(container, {
      series: [{ data, name: 'S' }],
      transition: { duration: 100, stagger: 100 },
    });
    const last = chart.el.querySelectorAll('.prism-bar')[29]!;

    // Uncapped, the 30th lane would start at 2900 ms. Capped to 400 ms total, it
    // is finished well before 500 ms.
    frames.shift()?.(0);
    frames.shift()?.(500);

    expect(Number(last.getAttribute('height'))).toBeGreaterThan(0);
    chart.dispose();
  });
});
