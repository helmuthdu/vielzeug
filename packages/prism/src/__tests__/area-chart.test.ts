import { signal } from '@vielzeug/ripple';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChartPlugin } from '../types';

import { createAreaChart } from '../charts/area';

describe('createAreaChart', () => {
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
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
          ],
          name: 'Test',
        },
      ],
    });

    expect(chart.el).toBeInstanceOf(SVGSVGElement);
    chart.dispose();
  });

  it('disposes cleanly', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ x: 1, y: 10 }], name: 'Test' }],
    });

    chart.dispose();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders area fill element', () => {
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
            { x: 3, y: 15 },
          ],
          name: 'Test',
        },
      ],
    });

    expect(chart.el.querySelector('.prism-area-fill')).not.toBeNull();
    chart.dispose();
  });

  it('renders a legend when legend is true', () => {
    const chart = createAreaChart(container, {
      legend: true,
      series: [
        { data: [{ x: 1, y: 10 }], name: 'Alpha' },
        { data: [{ x: 1, y: 20 }], name: 'Beta' },
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
    const chart = createAreaChart(container, {
      legend: { position: 'top' },
      series: [{ data: [{ x: 1, y: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend-top')).not.toBeNull();
    chart.dispose();
  });

  it('removes legend element on dispose', () => {
    const chart = createAreaChart(container, {
      legend: true,
      series: [{ data: [{ x: 1, y: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-legend')).toBeNull();
  });

  it('does not render legend when legend is omitted', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ x: 1, y: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).toBeNull();
    chart.dispose();
  });

  it('double dispose is a no-op', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ x: 1, y: 5 }], name: 'Series' }],
    });

    chart.dispose();
    expect(() => chart.dispose()).not.toThrow();
  });

  it('does not expose update() on ChartHandle', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ x: 1, y: 10 }], name: 'Test' }],
    });

    expect('update' in chart).toBe(false);
    chart.dispose();
  });

  it('renders tooltip inside container (not body)', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ x: 1, y: 10 }], name: 'Test' }],
      tooltip: true,
    });

    expect(container.querySelector('.prism-tooltip')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-tooltip')).toBeNull();
  });

  it('accepts reactive data via signals', () => {
    const data = signal([{ x: 1, y: 10 }]);
    const chart = createAreaChart(container, {
      series: [{ data, name: 'Reactive' }],
    });

    data.value = [...data.value, { x: 2, y: 20 }];
    chart.dispose();
  });

  it('calls onHover(null) on mouseleave', () => {
    const onHover = vi.fn();
    const chart = createAreaChart(container, {
      onHover,
      series: [{ data: [{ x: 1, y: 10 }], name: 'Test' }],
    });

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onHover).toHaveBeenCalledWith(null);
    chart.dispose();
  });

  it('installs and disposes plugins', () => {
    const install = vi.fn();
    const dispose = vi.fn();
    const plugin: ChartPlugin = { dispose, install };

    const chart = createAreaChart(container, {
      plugins: [plugin],
      series: [{ data: [{ x: 1, y: 10 }], name: 'Test' }],
    });

    expect(install).toHaveBeenCalledWith(chart.el, container);
    chart.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('renders with Date x-axis (time scale)', () => {
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { x: new Date('2024-01-01'), y: 10 },
            { x: new Date('2024-06-01'), y: 20 },
          ],
          name: 'Time',
        },
      ],
      xAxis: { position: 'bottom' },
    });

    expect(chart.el.querySelector('.prism-area-fill')).not.toBeNull();
    chart.dispose();
  });

  it('suppresses line path when showLine is false', () => {
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
          ],
          name: 'NoLine',
          showLine: false,
        },
      ],
    });

    expect(chart.el.querySelector('.prism-area-line')).toBeNull();
    expect(chart.el.querySelector('.prism-area-fill')).not.toBeNull();
    chart.dispose();
  });

  it('renders nothing and does not throw with empty series data', () => {
    expect(() => {
      const chart = createAreaChart(container, {
        series: [{ data: [], name: 'Empty' }],
      });

      chart.dispose();
    }).not.toThrow();
  });

  it('reactive signal update re-renders area', async () => {
    const data = signal([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const chart = createAreaChart(container, {
      series: [{ data, name: 'Reactive' }],
    });

    await new Promise((r) => requestAnimationFrame(r));
    data.value = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ];
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    expect(chart.el.querySelector('.prism-area-fill')).not.toBeNull();
    chart.dispose();
  });

  it('emits devWarn and renders no series paths when data is empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chart = createAreaChart(container, {
      series: [{ data: [], name: 'Empty' }],
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('createAreaChart: no data'));
    expect(chart.el.querySelector('.prism-area-fill')).toBeNull();
    chart.dispose();
    warn.mockRestore();
  });

  it('creates only one crosshair group on repeated reactive renders', async () => {
    const data = signal([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const chart = createAreaChart(container, {
      crosshair: true,
      series: [{ data, name: 'S' }],
    });

    data.value = [
      { x: 1, y: 5 },
      { x: 2, y: 15 },
      { x: 3, y: 25 },
    ];
    await new Promise((r) => setTimeout(r, 50));

    expect(chart.el.querySelectorAll('.prism-crosshair').length).toBe(1);
    chart.dispose();
  });
});
