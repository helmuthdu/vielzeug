import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLineChart } from '../charts/line';

describe('createLineChart', () => {
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

  it('creates an SVG element in the container', () => {
    const chart = createLineChart(container, {
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
    expect(container.querySelector('svg')).toBe(chart.el);
    chart.dispose();
  });

  it('disposes cleanly', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });

    chart.dispose();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('rolls back mounted resources when the initial render throws', () => {
    expect(() =>
      createLineChart(container, {
        series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
        xAxis: {
          tickFormat: () => {
            throw new Error('format failed');
          },
        },
      }),
    ).toThrow('Failed to render chart.');

    expect(container.children).toHaveLength(0);
  });

  it('double dispose is a no-op', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });

    chart.dispose();
    expect(() => chart.dispose()).not.toThrow();
  });

  it('rejects updates after disposal', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });

    chart.dispose();
    expect(() => chart.update([])).toThrow('Cannot update a disposed chart.');
  });

  it('disposed reflects lifecycle state', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });

    expect(chart.disposed).toBe(false);
    chart.dispose();
    expect(chart.disposed).toBe(true);
    chart.dispose();
    expect(chart.disposed).toBe(true);
  });

  it('updates data explicitly', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test', showPoints: true }],
    });

    chart.update([
      {
        data: [
          { key: 1, value: 10 },
          { key: 2, value: 20 },
          { key: 3, value: 30 },
        ],
        name: 'Test',
        showPoints: true,
      },
    ]);

    expect(chart.el.querySelectorAll('.prism-line-dot')).toHaveLength(3);
    chart.dispose();
  });

  it('clears series, grid, and axis groups when updated with empty data (B6)', () => {
    const chart = createLineChart(container, {
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

    expect(chart.el.querySelector('.prism-line-series')).not.toBeNull();
    chart.update([{ data: [], name: 'Test' }]);
    expect(chart.el.querySelector('.prism-line-series')).toBeNull();
    expect(chart.el.querySelector('.prism-grid-line')).toBeNull();
    expect(chart.el.querySelector('.prism-axis-tick')).toBeNull();
    chart.dispose();
  });

  it('supports Symbol.dispose', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 5 }], name: 'Test' }],
    });

    chart[Symbol.dispose]();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders with axis configuration', () => {
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'Test',
        },
      ],
      xAxis: { position: 'bottom' },
      yAxis: { grid: true, position: 'left' },
    });

    expect(chart.el.querySelector('.prism-x-axis')).not.toBeNull();
    expect(chart.el.querySelector('.prism-y-axis')).not.toBeNull();
    chart.dispose();
  });

  it('renders a legend when legend is true', () => {
    const chart = createLineChart(container, {
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
    const chart = createLineChart(container, {
      legend: { position: 'top' },
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend-top')).not.toBeNull();
    chart.dispose();
  });

  it('removes legend element on dispose', () => {
    const chart = createLineChart(container, {
      legend: true,
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-legend')).toBeNull();
  });

  it('does not render legend when legend is omitted', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).toBeNull();
    chart.dispose();
  });

  it('renders tooltip inside container (not body)', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
      tooltip: true,
    });

    expect(container.querySelector('.prism-tooltip')).not.toBeNull();
    expect(document.body.querySelector('.prism-tooltip')).toBe(container.querySelector('.prism-tooltip'));
    chart.dispose();
    expect(container.querySelector('.prism-tooltip')).toBeNull();
  });

  it('calls onHover with event data on mousemove', async () => {
    const onHover = vi.fn();
    const chart = createLineChart(container, {
      onHover,
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'Test',
        },
      ],
      tooltip: true,
    });

    // Wait one RAF for initial render
    await new Promise((r) => requestAnimationFrame(r));

    // x=300 falls within the chart area (margin.left=50 .. width-margin.right=580), so this
    // deterministically hits the series — not a "may or may not fire" hope.
    const mouseMove = new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 150 });

    chart.el.dispatchEvent(mouseMove);

    expect(onHover).toHaveBeenCalledWith(
      expect.objectContaining({
        datum: expect.objectContaining({ value: expect.any(Number) }),
        series: expect.objectContaining({ name: 'Test' }),
      }),
    );
    chart.dispose();
  });

  it('supports keyboard exploration and activation', () => {
    const onClick = vi.fn();
    const onHover = vi.fn();
    const chart = createLineChart(container, {
      onClick,
      onHover,
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

    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

    expect(onHover).toHaveBeenCalled();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ datum: { key: 2, value: 20 } }));
    chart.dispose();
  });

  it('calls onHover(null) on mouseleave', () => {
    const onHover = vi.fn();
    const chart = createLineChart(container, {
      onHover,
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onHover).toHaveBeenCalledWith(null);
    chart.dispose();
  });

  it('renders with Date key (time scale)', () => {
    const chart = createLineChart(container, {
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

    expect(chart.el.querySelector('.prism-line-series')).not.toBeNull();
    chart.dispose();
  });

  it('renders nothing and does not throw with empty series data', () => {
    expect(() => {
      const chart = createLineChart(container, {
        series: [{ data: [], name: 'Empty' }],
      });

      chart.dispose();
    }).not.toThrow();
  });

  it('removes mouse listeners after dispose (no error on synthetic events)', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
    });
    const svg = chart.el;

    chart.dispose();
    expect(() => svg.dispatchEvent(new MouseEvent('mousemove'))).not.toThrow();
  });

  it('renders legend in left position', () => {
    const chart = createLineChart(container, {
      legend: { position: 'left' },
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend-left')).not.toBeNull();
    chart.dispose();
  });

  it('renders legend in right position', () => {
    const chart = createLineChart(container, {
      legend: { position: 'right' },
      series: [{ data: [{ key: 1, value: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend-right')).not.toBeNull();
    chart.dispose();
  });

  it('does not throw with empty series data (regression)', () => {
    const chart = createLineChart(container, {
      series: [{ data: [], name: 'Empty' }],
    });

    expect(container.querySelector('svg')).not.toBeNull();
    chart.dispose();
  });

  it('passes axe accessibility audit', async () => {
    const chart = createLineChart(container, {
      a11y: { ariaLabel: 'Line chart test' },
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

  it('cancels an in-flight line transition on dispose (B9)', async () => {
    // The first-ever render has no prior `d` to tween from, so it draws synchronously —
    // an update on an already-mounted chart is what actually schedules the
    // requestAnimationFrame loop the transition (and this cancellation) targets.
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'Test' }],
      transition: { duration: 500 },
    });

    await new Promise((r) => requestAnimationFrame(r));
    chart.update([{ data: [{ key: 1, value: 90 }], name: 'Test' }]);
    await new Promise((r) => requestAnimationFrame(r));

    const path = chart.el.querySelector('.prism-line-path') as SVGPathElement;
    const dMidTransition = path.getAttribute('d');

    chart.dispose();

    // If the rAF loop weren't cancelled by disposalSignal, this next frame would still
    // mutate `d` on the now-detached path.
    await new Promise((r) => requestAnimationFrame(r));
    expect(path.getAttribute('d')).toBe(dMidTransition);
  });
});
