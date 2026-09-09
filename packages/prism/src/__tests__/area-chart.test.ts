import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
            { key: 1, value: 10 },
            { key: 2, value: 20 },
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
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });

    chart.dispose();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('clears series, grid, and axis groups when updated with empty data (B6)', () => {
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'Test',
        },
      ],
      xAxis: { grid: true },
      yAxis: { grid: true },
    });

    expect(chart.el.querySelector('.prism-area-series')).not.toBeNull();
    chart.update([{ data: [], name: 'Test' }]);
    expect(chart.el.querySelector('.prism-area-series')).toBeNull();
    expect(chart.el.querySelector('.prism-grid-line')).toBeNull();
    expect(chart.el.querySelector('.prism-axis-tick')).toBeNull();
    chart.dispose();
  });

  it('renders area fill element', () => {
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
            { key: 3, value: 15 },
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
        { data: [{ key: 1, value: 10 }], name: 'Alpha' },
        { data: [{ key: 1, value: 20 }], name: 'Beta' },
      ],
    });

    const legend = container.querySelector('.prism-legend');

    expect(legend).not.toBeNull();
    expect(legend?.querySelectorAll('.prism-legend-item').length).toBe(2);
    expect(legend?.querySelectorAll('.prism-legend-label')[0].textContent).toBe('Alpha');
    expect(legend?.querySelectorAll('.prism-legend-label')[1].textContent).toBe('Beta');
    chart.dispose();
  });

  it('renders legend in specified position', () => {
    const chart = createAreaChart(container, {
      legend: { position: 'top' },
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend-top')).not.toBeNull();
    chart.dispose();
  });

  it('removes legend element on dispose', () => {
    const chart = createAreaChart(container, {
      legend: true,
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-legend')).toBeNull();
  });

  it('does not render legend when legend is omitted', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).toBeNull();
    chart.dispose();
  });

  it('double dispose is a no-op', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    chart.dispose();
    expect(() => chart.dispose()).not.toThrow();
  });

  it('renders tooltip inside container (not body)', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
      tooltip: true,
    });

    expect(container.querySelector('.prism-tooltip')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-tooltip')).toBeNull();
  });

  it('calls onHover(null) on mouseleave', () => {
    const onHover = vi.fn();
    const chart = createAreaChart(container, {
      onHover,
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onHover).toHaveBeenCalledWith(null);
    chart.dispose();
  });

  it('renders with Date key (time scale)', () => {
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { key: new Date('2024-01-01'), value: 10 },
            { key: new Date('2024-06-01'), value: 20 },
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
            { key: 1, value: 10 },
            { key: 2, value: 20 },
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

  it('updates area data explicitly', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });
    const before = chart.el.querySelector('.prism-area-fill')?.getAttribute('d');

    chart.update([
      {
        data: [
          { key: 1, value: 10 },
          { key: 2, value: 20 },
          { key: 3, value: 30 },
        ],
        name: 'Test',
      },
    ]);

    expect(chart.el.querySelector('.prism-area-fill')?.getAttribute('d')).not.toBe(before);
    chart.dispose();
  });

  it('creates only one crosshair group after updates', () => {
    const chart = createAreaChart(container, {
      crosshair: true,
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
    });

    chart.update([
      {
        data: [
          { key: 1, value: 5 },
          { key: 2, value: 15 },
          { key: 3, value: 25 },
        ],
        name: 'S',
      },
    ]);

    expect(chart.el.querySelectorAll('.prism-crosshair')).toHaveLength(1);
    chart.dispose();
  });

  it('passes axe accessibility audit', async () => {
    const chart = createAreaChart(container, {
      a11y: { ariaLabel: 'Area chart test' },
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'Series',
        },
      ],
    });
    const results = await axeCheck(container);

    expect(results.violations).toHaveLength(0);
    chart.dispose();
  });

  it('cancels an in-flight area transition on dispose (B9)', async () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
      transition: { duration: 500 },
    });

    await new Promise((r) => requestAnimationFrame(r));
    chart.update([{ data: [{ key: 1, value: 90 }], name: 'Test' }]);
    await new Promise((r) => requestAnimationFrame(r));

    const fill = chart.el.querySelector('.prism-area-fill') as SVGPathElement;
    const dMidTransition = fill.getAttribute('d');

    chart.dispose();

    await new Promise((r) => requestAnimationFrame(r));
    expect(fill.getAttribute('d')).toBe(dMidTransition);
  });
});
