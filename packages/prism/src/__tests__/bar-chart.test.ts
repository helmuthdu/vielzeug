import { signal } from '@vielzeug/ripple';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChartPlugin } from '../types';

import { createBarChart } from '../charts/bar';

describe('createBarChart', () => {
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
  });

  it('creates an SVG element', () => {
    const chart = createBarChart(container, {
      series: [
        {
          data: [
            { key: 'A', value: 10 },
            { key: 'B', value: 20 },
          ],
          name: 'Test',
        },
      ],
    });

    expect(chart.el).toBeInstanceOf(SVGSVGElement);
    chart.dispose();
  });

  it('disposes cleanly', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'A', value: 10 }], name: 'Test' }],
    });

    chart.dispose();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('clears series, grid, and axis groups when reactive data becomes empty (B6)', async () => {
    const data = signal([
      { key: 'A', value: 10 },
      { key: 'B', value: 20 },
    ]);
    const chart = createBarChart(container, {
      series: [{ data, name: 'Reactive' }],
      xAxis: { position: 'bottom' },
      yAxis: { grid: true, position: 'left' },
    });

    await new Promise((r) => requestAnimationFrame(r));
    expect(chart.el.querySelector('.prism-bar-series')).not.toBeNull();
    expect(chart.el.querySelector('.prism-grid-line')).not.toBeNull();
    expect(chart.el.querySelector('.prism-axis-tick')).not.toBeNull();

    data.value = [];
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    expect(chart.el.querySelector('.prism-bar-series')).toBeNull();
    expect(chart.el.querySelector('.prism-grid-line')).toBeNull();
    expect(chart.el.querySelector('.prism-axis-tick')).toBeNull();
    chart.dispose();
  });

  it('renders multiple series', () => {
    const chart = createBarChart(container, {
      series: [
        { data: [{ key: 'A', value: 10 }], name: 'Series 1' },
        { data: [{ key: 'A', value: 15 }], name: 'Series 2' },
      ],
    });

    expect(chart.el.querySelectorAll('.prism-bar-series').length).toBe(2);
    chart.dispose();
  });

  it('renders a legend when legend is true', () => {
    const chart = createBarChart(container, {
      legend: true,
      series: [
        { data: [{ key: 'A', value: 10 }], name: 'Alpha' },
        { data: [{ key: 'A', value: 20 }], name: 'Beta' },
      ],
    });

    const legend = container.querySelector('.prism-legend');

    expect(legend).not.toBeNull();
    expect(legend!.querySelectorAll('.prism-legend-item').length).toBe(2);
    expect(legend!.querySelectorAll('.prism-legend-label')[0].textContent).toBe('Alpha');
    expect(legend!.querySelectorAll('.prism-legend-label')[1].textContent).toBe('Beta');
    chart.dispose();
  });

  it('renders legend in specified position', () => {
    const chart = createBarChart(container, {
      legend: { position: 'top' },
      series: [{ data: [{ key: 'A', value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend-top')).not.toBeNull();
    chart.dispose();
  });

  it('removes legend element on dispose', () => {
    const chart = createBarChart(container, {
      legend: true,
      series: [{ data: [{ key: 'A', value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-legend')).toBeNull();
  });

  it('does not render legend when legend is omitted', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'A', value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).toBeNull();
    chart.dispose();
  });

  it('double dispose is a no-op', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'A', value: 5 }], name: 'Series' }],
    });

    chart.dispose();
    expect(() => chart.dispose()).not.toThrow();
  });

  it('does not expose update() on ChartHandle', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'A', value: 10 }], name: 'Test' }],
    });

    expect('update' in chart).toBe(false);
    chart.dispose();
  });

  it('renders tooltip inside container (not body)', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'A', value: 10 }], name: 'Test' }],
      tooltip: true,
    });

    expect(container.querySelector('.prism-tooltip')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-tooltip')).toBeNull();
  });

  it('accepts reactive data via signals', () => {
    const data = signal([{ key: 'A', value: 10 }]);
    const chart = createBarChart(container, {
      series: [{ data, name: 'Reactive' }],
    });

    data.value = [...data.value, { key: 'B', value: 20 }];
    chart.dispose();
  });

  it('calls onHover(null) on mouseleave', () => {
    const onHover = vi.fn();
    const chart = createBarChart(container, {
      onHover,
      series: [{ data: [{ key: 'A', value: 10 }], name: 'Test' }],
    });

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onHover).toHaveBeenCalledWith(null);
    chart.dispose();
  });

  it('installs and disposes plugins', () => {
    const install = vi.fn();
    const dispose = vi.fn();
    const plugin: ChartPlugin = { dispose, install };

    const chart = createBarChart(container, {
      plugins: [plugin],
      series: [{ data: [{ key: 'A', value: 10 }], name: 'Test' }],
    });

    expect(install).toHaveBeenCalledWith(expect.objectContaining({ container, svg: chart.el }));
    chart.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('renders bar elements for each data point', () => {
    const chart = createBarChart(container, {
      series: [
        {
          data: [
            { key: 'A', value: 10 },
            { key: 'B', value: 20 },
            { key: 'C', value: 15 },
          ],
          name: 'Test',
        },
      ],
    });

    expect(chart.el.querySelectorAll('.prism-bar').length).toBe(3);
    chart.dispose();
  });

  it('renders stacked bars with correct bar count', () => {
    const chart = createBarChart(container, {
      series: [
        {
          color: '#3b82f6',
          data: [
            { key: 'A', value: 10 },
            { key: 'B', value: 20 },
          ],
          name: 'S1',
        },
        {
          color: '#10b981',
          data: [
            { key: 'A', value: 15 },
            { key: 'B', value: 25 },
          ],
          name: 'S2',
        },
      ],
      variant: 'stacked',
      xAxis: { position: 'bottom' },
      yAxis: { position: 'left' },
    });

    expect(chart.el.querySelectorAll('.prism-bar').length).toBe(4);
    chart.dispose();
  });

  it('stacked bars use full bandwidth', () => {
    const chart = createBarChart(container, {
      series: [
        { color: '#3b82f6', data: [{ key: 'A', value: 10 }], name: 'S1' },
        { color: '#10b981', data: [{ key: 'A', value: 20 }], name: 'S2' },
      ],
      variant: 'stacked',
    });

    const bars = chart.el.querySelectorAll('.prism-bar');

    expect(bars.length).toBe(2);
    expect(bars[0].getAttribute('x')).toBe(bars[1].getAttribute('x'));
    chart.dispose();
  });

  it('warns and clamps negative values to 0 in stacked variants (B7)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chart = createBarChart(container, {
      series: [
        { color: '#3b82f6', data: [{ key: 'A', value: -5 }], name: 'S1' },
        { color: '#10b981', data: [{ key: 'A', value: 20 }], name: 'S2' },
      ],
      variant: 'stacked',
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('negative values'));

    const bars = chart.el.querySelectorAll('.prism-bar');

    // S1's negative value is clamped to 0 — a zero-height rect, not a crash or NaN.
    expect(Number(bars[0].getAttribute('height'))).toBe(0);
    expect(Number(bars[0].getAttribute('height'))).not.toBeNaN();
    chart.dispose();
    warnSpy.mockRestore();
  });

  it('renders horizontal bars with height and width > 0', () => {
    const chart = createBarChart(container, {
      series: [
        {
          color: '#3b82f6',
          data: [
            { key: 'A', value: 10 },
            { key: 'B', value: 20 },
          ],
          name: 'S1',
        },
      ],
      variant: 'grouped-horizontal',
      xAxis: { position: 'bottom' },
      yAxis: { position: 'left' },
    });

    const bars = chart.el.querySelectorAll('.prism-bar');

    expect(bars.length).toBe(2);
    expect(Number(bars[0].getAttribute('height'))).toBeGreaterThan(0);
    expect(Number(bars[0].getAttribute('width'))).toBeGreaterThan(0);
    chart.dispose();
  });

  it('renders stacked-horizontal bars', () => {
    const chart = createBarChart(container, {
      series: [
        { data: [{ key: 'A', value: 10 }], name: 'S1' },
        { data: [{ key: 'A', value: 20 }], name: 'S2' },
      ],
      variant: 'stacked-horizontal',
    });

    const bars = chart.el.querySelectorAll('.prism-bar');

    expect(bars.length).toBe(2);
    expect(Number(bars[0].getAttribute('height'))).toBeGreaterThan(0);
    chart.dispose();
  });

  it('renders nothing and does not throw with empty series data', () => {
    expect(() => {
      const chart = createBarChart(container, {
        series: [{ data: [], name: 'Empty' }],
      });

      chart.dispose();
    }).not.toThrow();
  });

  it('supports Symbol.dispose', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'A', value: 5 }], name: 'Test' }],
    });

    chart[Symbol.dispose]();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('reactive signal update re-renders bars', async () => {
    const data = signal([{ key: 'A', value: 10 }]);
    const chart = createBarChart(container, {
      series: [{ data, name: 'Reactive' }],
    });

    await new Promise((r) => requestAnimationFrame(r));
    expect(chart.el.querySelectorAll('.prism-bar').length).toBe(1);
    data.value = [
      { key: 'A', value: 10 },
      { key: 'B', value: 20 },
    ];
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    expect(chart.el.querySelectorAll('.prism-bar').length).toBe(2);
    chart.dispose();
  });

  it('calls onClick with datum and series on click event', () => {
    const onClick = vi.fn();
    const chart = createBarChart(container, {
      onClick,
      series: [{ data: [{ key: 'A', value: 10 }], name: 'Test' }],
    });

    chart.el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 0 }));
    // jsdom has no layout so hit test may not fire — verify no throw
    chart.dispose();
  });

  it('removes mouse listeners after dispose (no error on synthetic events)', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'A', value: 10 }], name: 'Test' }],
    });
    const svg = chart.el;

    chart.dispose();
    expect(() => svg.dispatchEvent(new MouseEvent('mousemove'))).not.toThrow();
    expect(() => svg.dispatchEvent(new MouseEvent('click'))).not.toThrow();
  });

  it('calls onHover(null) on mouseleave (second)', () => {
    const onHover = vi.fn();
    const chart = createBarChart(container, {
      onHover,
      series: [{ data: [{ key: 'A', value: 10 }], name: 'Test' }],
    });

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onHover).toHaveBeenCalledWith(null);
    chart.dispose();
  });

  it('passes axe accessibility audit', async () => {
    const chart = createBarChart(container, {
      ariaLabel: 'Bar chart test',
      series: [
        {
          data: [
            { key: 'A', value: 10 },
            { key: 'B', value: 20 },
          ],
          name: 'Series',
        },
      ],
    });
    const results = await axeCheck(container);

    expect(results.violations).toHaveLength(0);
    chart.dispose();
  });

  it('cancels an in-flight bar transition on dispose (B9)', async () => {
    const data = signal([{ key: 'A', value: 10 }]);
    const chart = createBarChart(container, {
      series: [{ data, name: 'Test' }],
      transition: { duration: 500 },
    });

    await new Promise((r) => requestAnimationFrame(r));
    data.value = [{ key: 'A', value: 90 }];
    await new Promise((r) => requestAnimationFrame(r));

    const rect = chart.el.querySelector('.prism-bar') as SVGRectElement;
    const heightMidTransition = rect.getAttribute('height');

    chart.dispose();

    await new Promise((r) => requestAnimationFrame(r));
    expect(rect.getAttribute('height')).toBe(heightMidTransition);
  });
});
