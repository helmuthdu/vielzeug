import { signal } from '@vielzeug/ripple';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSparkline } from '../charts/sparkline';

describe('createSparkline', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 32, width: 120, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates an SVG element in the container', () => {
    const chart = createSparkline(container, { data: [1, 2, 3, 4, 5] });

    expect(chart.el).toBeInstanceOf(SVGSVGElement);
    expect(container.querySelector('svg')).toBe(chart.el);
    chart.dispose();
  });

  it('disposes cleanly', () => {
    const chart = createSparkline(container, { data: [1, 2, 3] });

    chart.dispose();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('double dispose is a no-op', () => {
    const chart = createSparkline(container, { data: [1, 2, 3] });

    chart.dispose();
    expect(() => chart.dispose()).not.toThrow();
  });

  it('supports Symbol.dispose', () => {
    const chart = createSparkline(container, { data: [1, 2, 3] });

    chart[Symbol.dispose]();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders a line path by default (variant: line)', () => {
    const chart = createSparkline(container, { data: [1, 2, 3, 4, 5] });

    expect(chart.el.querySelector('.prism-spark-line')).not.toBeNull();
    expect(chart.el.querySelector('.prism-spark-fill')).toBeNull();
    chart.dispose();
  });

  it('renders fill path for variant: area', () => {
    const chart = createSparkline(container, {
      data: [1, 2, 3, 4, 5],
      variant: 'area',
    });

    expect(chart.el.querySelector('.prism-spark-fill')).not.toBeNull();
    expect(chart.el.querySelector('.prism-spark-line')).not.toBeNull();
    chart.dispose();
  });

  it('renders bar rects for variant: bar', () => {
    const chart = createSparkline(container, {
      data: [10, 20, 30],
      variant: 'bar',
    });

    expect(chart.el.querySelectorAll('.prism-spark-bar').length).toBe(3);
    chart.dispose();
  });

  it('accepts reactive data via signal', () => {
    const data = signal([1, 2, 3]);
    const chart = createSparkline(container, { data });

    data.value = [1, 2, 3, 4];
    chart.dispose();
  });

  it('renders empty chart for empty data without throwing', () => {
    expect(() => {
      const chart = createSparkline(container, { data: [] });

      chart.dispose();
    }).not.toThrow();
  });

  it('calls onHover on mouseleave with null', () => {
    const onHover = vi.fn();
    const chart = createSparkline(container, {
      data: [10, 20, 30],
      onHover,
    });

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(onHover).toHaveBeenCalledWith(null, null);
    chart.dispose();
  });

  it('calls onClick on click event', () => {
    const onClick = vi.fn();
    const chart = createSparkline(container, {
      data: [10, 20, 30],
      onClick,
    });

    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 32, left: 0, top: 0, width: 120 }),
    });

    chart.el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 16 }));
    expect(onClick).toHaveBeenCalled();
    chart.dispose();
  });

  it('has aria-hidden on the SVG (sparklines are decorative)', () => {
    const chart = createSparkline(container, { data: [1, 2, 3] });

    expect(chart.el.getAttribute('aria-hidden')).toBe('true');
    chart.dispose();
  });

  it('applies custom color to line stroke', () => {
    const chart = createSparkline(container, { color: '#ff0000', data: [1, 2, 3] });

    const line = chart.el.querySelector('.prism-spark-line');

    expect(line?.getAttribute('stroke')).toBe('#ff0000');
    chart.dispose();
  });

  it('applies custom strokeWidth', () => {
    const chart = createSparkline(container, { data: [1, 2, 3], strokeWidth: 3 });

    const line = chart.el.querySelector('.prism-spark-line');

    expect(line?.getAttribute('stroke-width')).toBe('3');
    chart.dispose();
  });

  it('renders stack segments for variant: stack', () => {
    const chart = createSparkline(container, {
      data: [
        { color: '#ff0000', label: 'A', value: 50 },
        { color: '#00ff00', label: 'B', value: 30 },
        { color: '#0000ff', label: 'C', value: 20 },
      ],
      variant: 'stack',
    });

    expect(chart.el.querySelectorAll('.prism-spark-stack-segment').length).toBe(3);
    chart.dispose();
  });

  it('stack segment fills use provided colors', () => {
    const chart = createSparkline(container, {
      data: [
        { color: '#ff0000', value: 60 },
        { color: '#00ff00', value: 40 },
      ],
      variant: 'stack',
    });

    const segs = chart.el.querySelectorAll('.prism-spark-stack-segment');

    expect(segs[0]?.getAttribute('fill')).toBe('#ff0000');
    expect(segs[1]?.getAttribute('fill')).toBe('#00ff00');
    chart.dispose();
  });
});
