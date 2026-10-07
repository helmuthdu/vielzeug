import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createScatterChart } from '../charts/scatter';

/** Collects rAF callbacks so a test can advance a tween to an exact timestamp. */
function driveFrames(): FrameRequestCallback[] {
  const frames: FrameRequestCallback[] = [];

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    frames.push(cb);

    return frames.length;
  });

  return frames;
}

/** Width of the reveal clip rect a wiped-in group is currently clipped by. */
function clipWidthFor(root: Element, group: Element): number {
  const id = group.getAttribute('clip-path')?.match(/#(.+)\)/)?.[1];

  return Number(root.querySelector(`clipPath#${CSS.escape(id ?? '')} rect`)?.getAttribute('width'));
}

const POINTS = [
  { key: 1, value: 10 },
  { key: 2, value: 20 },
  { key: 3, value: 30 },
];

describe('createScatterChart', () => {
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

  it('creates an SVG element in the container', () => {
    const chart = createScatterChart(container, { series: [{ data: POINTS, name: 'Test' }] });

    expect(chart.el).toBeInstanceOf(SVGSVGElement);
    expect(container.querySelector('svg')).toBe(chart.el);
    chart.dispose();
  });

  it('renders one point per datum', () => {
    const chart = createScatterChart(container, { series: [{ data: POINTS, name: 'Test' }], transition: false });

    expect(chart.el.querySelectorAll('.prism-scatter-point')).toHaveLength(3);
    chart.dispose();
  });

  it('renders each series in its own group with a stable data-series-id', () => {
    const chart = createScatterChart(container, {
      series: [
        { data: [{ key: 1, value: 5 }], name: 'Alpha' },
        { data: [{ key: 1, value: 9 }], id: 'beta', name: 'Beta' },
      ],
      transition: false,
    });
    const groups = chart.el.querySelectorAll('.prism-scatter-series');

    expect(groups).toHaveLength(2);
    expect(groups[0].getAttribute('data-series-id')).toBe('series-0');
    expect(groups[1].getAttribute('data-series-id')).toBe('beta');
    chart.dispose();
  });

  it('honours a per-series point radius', () => {
    const chart = createScatterChart(container, {
      series: [{ data: POINTS, name: 'Test', pointRadius: 7 }],
      transition: false,
    });

    expect(chart.el.querySelector('.prism-scatter-point')?.getAttribute('r')).toBe('7');
    chart.dispose();
  });

  it('honours per-datum opacity so overlapping points can be shown', () => {
    const chart = createScatterChart(container, {
      series: [{ data: [{ key: 1, opacity: 0.4, value: 10 }], name: 'Test' }],
      transition: false,
    });

    expect(chart.el.querySelector('.prism-scatter-point')?.getAttribute('opacity')).toBe('0.4');
    chart.dispose();
  });

  it('fits the value axis to the data instead of forcing a zero baseline', () => {
    const chart = createScatterChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 100 },
            { key: 2, value: 110 },
          ],
          name: 'Tight',
        },
      ],
      transition: false,
    });
    const [low, high] = [...chart.el.querySelectorAll('.prism-scatter-point')];

    // A forced-zero domain would squash both points near the top; a fitted domain
    // puts the minimum at the bottom of the plot and the maximum at the top.
    expect(Number(low.getAttribute('cy'))).toBeGreaterThan(220);
    expect(Number(high.getAttribute('cy'))).toBeLessThan(10);
    chart.dispose();
  });

  it('updates data explicitly', () => {
    const chart = createScatterChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
      transition: false,
    });

    chart.update([{ data: POINTS, name: 'Test' }]);

    expect(chart.el.querySelectorAll('.prism-scatter-point')).toHaveLength(3);
    chart.dispose();
  });

  it('clears series, grid, and axis groups when updated with empty data', () => {
    const chart = createScatterChart(container, {
      series: [{ data: POINTS, name: 'Test' }],
      transition: false,
    });

    chart.update([]);

    expect(chart.el.querySelectorAll('.prism-scatter-point')).toHaveLength(0);
    expect(chart.el.querySelector('.prism-series')?.children).toHaveLength(0);
    chart.dispose();
  });

  it('disposes cleanly and rejects updates after disposal', () => {
    const chart = createScatterChart(container, { series: [{ data: POINTS, name: 'Test' }] });

    chart.dispose();
    expect(container.querySelector('svg')).toBeNull();
    expect(() => chart.update([])).toThrow('Cannot update a disposed chart.');
  });

  it('rolls back mounted resources when the initial render throws', () => {
    expect(() =>
      createScatterChart(container, {
        series: [{ data: POINTS, name: 'Test' }],
        xAxis: {
          tickFormat: () => {
            throw new Error('format failed');
          },
        },
      }),
    ).toThrow('Failed to render chart.');

    expect(container.children).toHaveLength(0);
  });

  it('calls onHover with the hovered point on mousemove', () => {
    const onHover = vi.fn();
    const chart = createScatterChart(container, {
      onHover,
      series: [{ data: POINTS, name: 'Test' }],
      tooltip: true,
      transition: false,
    });
    const point = chart.el.querySelectorAll('.prism-scatter-point')[1];

    point.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 150 }));

    expect(onHover).toHaveBeenCalledWith(
      expect.objectContaining({
        datum: expect.objectContaining({ key: 2, value: 20 }),
        series: expect.objectContaining({ name: 'Test' }),
      }),
    );
    chart.dispose();
  });

  it('selects the nearest point across series in two dimensions', () => {
    const onHover = vi.fn();
    const chart = createScatterChart(container, {
      onHover,
      series: [
        { data: [{ key: 1, value: 10 }], name: 'Low' },
        { data: [{ key: 1, value: 100 }], name: 'High' },
      ],
      transition: false,
    });
    // Hover the upper marker directly: the hit target wins over a nearest-by-x guess.
    const high = chart.el.querySelectorAll('.prism-scatter-series')[1].querySelector('circle')!;

    high.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 50, clientY: 20 }));

    expect(onHover).toHaveBeenCalledWith(
      expect.objectContaining({ series: expect.objectContaining({ name: 'High' }) }),
    );
    chart.dispose();
  });

  it('calls onClick with the clicked point', () => {
    const onClick = vi.fn();
    const chart = createScatterChart(container, {
      onClick,
      series: [{ data: POINTS, name: 'Test' }],
      transition: false,
    });
    const point = chart.el.querySelectorAll('.prism-scatter-point')[2];

    point.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 500, clientY: 40 }));

    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ datum: expect.objectContaining({ key: 3 }) }));
    chart.dispose();
  });

  it('supports keyboard exploration and activation', () => {
    const onClick = vi.fn();
    const onHover = vi.fn();
    const chart = createScatterChart(container, {
      onClick,
      onHover,
      series: [{ data: POINTS, name: 'Test' }],
      transition: false,
    });

    // Points are traversed in x order: three ArrowRight steps land on the third point.
    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ datum: expect.objectContaining({ key: 3 }) }));
    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ datum: expect.objectContaining({ key: 3 }) }));
    chart.dispose();
  });

  it('calls onHover(null) on mouseleave', () => {
    const onHover = vi.fn();
    const chart = createScatterChart(container, {
      onHover,
      series: [{ data: POINTS, name: 'Test' }],
      transition: false,
    });

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onHover).toHaveBeenCalledWith(null);
    chart.dispose();
  });

  it('renders a legend when legend is true', () => {
    const chart = createScatterChart(container, {
      legend: true,
      series: [
        { data: [{ key: 1, value: 5 }], name: 'Alpha' },
        { data: [{ key: 1, value: 9 }], name: 'Beta' },
      ],
      transition: false,
    });

    expect(container.querySelectorAll('.prism-legend-item')).toHaveLength(2);
    chart.dispose();
  });

  it('renders a tooltip inside the container', () => {
    const chart = createScatterChart(container, {
      series: [{ data: POINTS, name: 'Test' }],
      tooltip: true,
      transition: false,
    });

    expect(container.querySelector('.prism-tooltip')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-tooltip')).toBeNull();
  });

  it('wipes the finished points in on mount without a transition config', () => {
    const frames = driveFrames();
    const chart = createScatterChart(container, { series: [{ data: POINTS, name: 'Test' }] });
    const series = chart.el.querySelector('.prism-scatter-series')!;

    // Final markers are painted during render, then hidden behind a wipe clip.
    expect(series.querySelectorAll('.prism-scatter-point')).toHaveLength(3);
    expect(series.getAttribute('clip-path')).toMatch(/^url\(#prism-reveal-/);
    expect(clipWidthFor(chart.el, series)).toBe(0);

    frames.shift()?.(0);
    frames.shift()?.(1_000);

    expect(series.hasAttribute('clip-path')).toBe(false);
    chart.dispose();
  });

  it('transition: false renders points synchronously with no clip', () => {
    driveFrames();
    const chart = createScatterChart(container, {
      series: [{ data: POINTS, name: 'Test' }],
      transition: false,
    });

    expect(chart.el.querySelector('.prism-scatter-series')?.hasAttribute('clip-path')).toBe(false);
    chart.dispose();
  });

  it('slides points to new positions on update', () => {
    const frames = driveFrames();
    const chart = createScatterChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
            { key: 3, value: 30 },
          ],
          name: 'Test',
        },
      ],
      transition: { duration: 100 },
    });
    const middlePoint = () => chart.el.querySelectorAll('.prism-scatter-point')[1];

    frames.shift()?.(0);
    frames.shift()?.(1_000);

    const before = Number(middlePoint().getAttribute('cy'));

    // The endpoints hold the domain, so raising the middle value moves only it.
    chart.update([
      {
        data: [
          { key: 1, value: 10 },
          { key: 2, value: 25 },
          { key: 3, value: 30 },
        ],
        name: 'Test',
      },
    ]);

    // The update tween starts from the drawn position and finishes at the new one.
    frames.shift()?.(0);
    frames.shift()?.(1_000);

    expect(Number(middlePoint().getAttribute('cy'))).not.toBe(before);
    chart.dispose();
  });
});
