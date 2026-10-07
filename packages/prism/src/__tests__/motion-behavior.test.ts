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
  });

  it('bar charts grow from the baseline without any transition config', () => {
    const frames = driveFrames();
    const chart = createBarChart(container, { series: BARS });
    const bar = chart.el.querySelector('.prism-bar')!;

    expect(Number(bar.getAttribute('height'))).toBe(0);

    frames.shift()?.(0);
    frames.shift()?.(1_000);

    expect(Number(bar.getAttribute('height'))).toBeGreaterThan(0);
    chart.dispose();
  });

  it('transition: false renders bars at their final geometry synchronously', () => {
    driveFrames();
    const chart = createBarChart(container, { series: BARS, transition: false });

    expect(Number(chart.el.querySelector('.prism-bar')?.getAttribute('height'))).toBeGreaterThan(0);
    chart.dispose();
  });

  it('line charts raise the series from the baseline on mount', () => {
    const frames = driveFrames();
    const chart = createLineChart(container, { series: LINE_SERIES });
    const path = chart.el.querySelector('.prism-line-path')!;

    // The starting frame is painted during render, so the line is flat on the
    // baseline immediately rather than blank until the first callback.
    const mountYs = pathYs(path.getAttribute('d'));

    expect(mountYs).toHaveLength(2);
    expect(mountYs[0]).toBe(mountYs[1]);

    frames.shift()?.(0);
    frames.shift()?.(1_000);

    const finalYs = pathYs(path.getAttribute('d'));

    expect(finalYs[0]).not.toBe(finalYs[1]);
    chart.dispose();
  });

  it('area charts grow out of the baseline on mount', () => {
    const frames = driveFrames();
    const chart = createAreaChart(container, { series: LINE_SERIES });
    const fill = chart.el.querySelector('.prism-area-fill')!;
    const mountYs = pathYs(fill.getAttribute('d'));

    expect(new Set(mountYs).size).toBe(1);

    frames.shift()?.(0);
    frames.shift()?.(1_000);

    expect(new Set(pathYs(fill.getAttribute('d'))).size).toBeGreaterThan(1);
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
