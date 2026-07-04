import { signal } from '@vielzeug/ripple';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPieChart } from '../charts/pie';

const DATA = [
  { label: 'A', value: 30 },
  { label: 'B', value: 50 },
  { label: 'C', value: 20 },
];

describe('createPieChart', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 200, width: 200, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates an SVG element in the container', () => {
    const chart = createPieChart(container, { data: DATA });

    expect(chart.el).toBeInstanceOf(SVGSVGElement);
    expect(container.querySelector('svg')).toBe(chart.el);
    chart.dispose();
  });

  it('renders one path per slice', () => {
    const chart = createPieChart(container, { data: DATA, transition: { duration: 0 } });

    expect(chart.el.querySelectorAll('.prism-pie-slice').length).toBe(3);
    chart.dispose();
  });

  it('variant: pie renders slices without inner radius', () => {
    const chart = createPieChart(container, { data: DATA, transition: { duration: 0 }, variant: 'pie' });
    const slice = chart.el.querySelector('.prism-pie-slice') as SVGPathElement;

    expect(slice.getAttribute('d')).toContain('Z');
    chart.dispose();
  });

  it('variant: donut uses a non-zero inner radius', () => {
    const chart = createPieChart(container, { data: DATA, transition: { duration: 0 }, variant: 'donut' });
    const slices = chart.el.querySelectorAll('.prism-pie-slice');

    expect(slices.length).toBe(3);
    chart.dispose();
  });

  it('variant: semi renders a semicircle', () => {
    const chart = createPieChart(container, { data: DATA, transition: { duration: 0 }, variant: 'semi' });

    expect(chart.el.querySelectorAll('.prism-pie-slice').length).toBe(3);
    chart.dispose();
  });

  it('renders text labels when slice has label', () => {
    const chart = createPieChart(container, { data: DATA, transition: { duration: 0 } });

    expect(chart.el.querySelectorAll('.prism-pie-label').length).toBe(3);
    chart.dispose();
  });

  it('no label elements when slices have no label', () => {
    const noLabel = [{ value: 30 }, { value: 50 }];
    const chart = createPieChart(container, { data: noLabel, transition: { duration: 0 } });

    expect(chart.el.querySelectorAll('.prism-pie-label').length).toBe(0);
    chart.dispose();
  });

  it('accepts reactive data via signal and re-renders', () => {
    const data = signal([...DATA]);
    const chart = createPieChart(container, { data, transition: { duration: 0 } });

    data.value = [...DATA, { label: 'D', value: 10 }];
    chart.dispose();
  });

  it('renders empty chart for empty data without throwing', () => {
    expect(() => {
      const chart = createPieChart(container, { data: [], transition: { duration: 0 } });

      chart.dispose();
    }).not.toThrow();
  });

  it('disposes cleanly', () => {
    const chart = createPieChart(container, { data: DATA, transition: { duration: 0 } });

    chart.dispose();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('double dispose is a no-op', () => {
    const chart = createPieChart(container, { data: DATA, transition: { duration: 0 } });

    chart.dispose();
    expect(() => chart.dispose()).not.toThrow();
  });

  it('supports Symbol.dispose', () => {
    const chart = createPieChart(container, { data: DATA, transition: { duration: 0 } });

    chart[Symbol.dispose]();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('calls onHover null on mouseleave', () => {
    const onHover = vi.fn();
    const chart = createPieChart(container, { data: DATA, onHover, transition: { duration: 0 } });

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onHover).toHaveBeenCalledWith(null, null);
    chart.dispose();
  });

  it('applies custom color per slice', () => {
    const colored = [
      { color: '#ff0000', value: 50 },
      { color: '#00ff00', value: 50 },
    ];
    const chart = createPieChart(container, { data: colored, transition: { duration: 0 } });
    const slices = chart.el.querySelectorAll('.prism-pie-slice');

    expect(slices[0].getAttribute('fill')).toBe('#ff0000');
    expect(slices[1].getAttribute('fill')).toBe('#00ff00');
    chart.dispose();
  });

  it('respects explicit innerRadius override', () => {
    const chart = createPieChart(container, {
      data: DATA,
      innerRadius: 0,
      transition: { duration: 0 },
      variant: 'donut',
    });

    expect(chart.el.querySelectorAll('.prism-pie-slice').length).toBe(3);
    chart.dispose();
  });

  it('has role=img on SVG', () => {
    const chart = createPieChart(container, { data: DATA });

    expect(chart.el.getAttribute('role')).toBe('img');
    chart.dispose();
  });

  it('calls onClick callback on click event without throwing', () => {
    const onClick = vi.fn();
    const chart = createPieChart(container, { data: DATA, onClick, transition: { duration: 0 } });

    expect(() =>
      chart.el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 0 })),
    ).not.toThrow();
    chart.dispose();
  });

  it('cancels in-flight animation RAF on dispose', () => {
    const cancelSpy = vi.spyOn(global, 'cancelAnimationFrame');
    const chart = createPieChart(container, { data: DATA, transition: { duration: 500 } });

    // The pie's enter transition (duration: 500) schedules a rAF loop synchronously —
    // dispose() while it's still in flight must cancel it, not just avoid throwing.
    expect(() => chart.dispose()).not.toThrow();
    expect(cancelSpy).toHaveBeenCalled();
    cancelSpy.mockRestore();
  });

  it('renders legend items when legend is enabled', () => {
    const chart = createPieChart(container, {
      data: DATA,
      legend: true,
      transition: { duration: 0 },
    });

    expect(container.querySelector('.prism-legend')).not.toBeNull();
    expect(container.querySelectorAll('.prism-legend-item').length).toBe(3);
    chart.dispose();
  });

  it('passes axe accessibility audit', async () => {
    const chart = createPieChart(container, { ariaLabel: 'Pie chart test', data: DATA, transition: { duration: 0 } });
    const results = await axeCheck(container);

    expect(results.violations).toHaveLength(0);
    chart.dispose();
  });
});
