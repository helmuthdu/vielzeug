import { signal } from '@vielzeug/ripple';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAreaChart } from '../charts/area';
import { createBarChart } from '../charts/bar';
import { createLineChart } from '../charts/line';
import { createPieChart } from '../charts/pie';
import { createSparkline } from '../charts/sparkline';
import { buildXScale, buildYScale } from '../core/cartesian-scales';
import { devError, devWarn } from '../core/dev';
import { seriesColor, setTheme } from '../theme';

// ─── theme ───────────────────────────────────────────────────────────────────

describe('seriesColor', () => {
  it('returns CSS var by default', () => {
    expect(seriesColor(0)).toBe('var(--prism-color-1)');
    expect(seriesColor(7)).toBe('var(--prism-color-8)');
  });

  it('wraps at modulo 8', () => {
    expect(seriesColor(8)).toBe('var(--prism-color-1)');
  });

  it('returns override when provided', () => {
    expect(seriesColor(0, '#ff0000')).toBe('#ff0000');
  });
});

describe('setTheme', () => {
  it('sets --prism-color-N custom properties on documentElement', () => {
    setTheme({ colors: ['#aaa', '#bbb'] });
    expect(document.documentElement.style.getPropertyValue('--prism-color-1')).toBe('#aaa');
    expect(document.documentElement.style.getPropertyValue('--prism-color-2')).toBe('#bbb');
    document.documentElement.style.removeProperty('--prism-color-1');
    document.documentElement.style.removeProperty('--prism-color-2');
  });

  it('sets font-family', () => {
    setTheme({ fontFamily: 'sans-serif' });
    expect(document.documentElement.style.getPropertyValue('--prism-font-family')).toBe('sans-serif');
    document.documentElement.style.removeProperty('--prism-font-family');
  });
});

// ─── cartesian scales ─────────────────────────────────────────────────────────

describe('buildXScale', () => {
  it('builds a numeric linear scale', () => {
    const scale = buildXScale([0, 10, 20], 200);

    expect(scale.range).toEqual([0, 200]);
    expect(scale.domain[0]).toBeDefined();
  });

  it('builds a time scale for Date arrays', () => {
    const d1 = new Date('2024-01-01');
    const d2 = new Date('2024-12-31');
    const scale = buildXScale([d1, d2], 300);

    expect(scale.range).toEqual([0, 300]);
  });
});

describe('buildYScale', () => {
  it('domain min is clamped to 0 when all values positive', () => {
    const scale = buildYScale([10, 20, 30], 300);

    expect((scale.domain as [number, number])[0]).toBe(0);
  });

  it('domain min reflects negative values', () => {
    const scale = buildYScale([-5, 10], 300);

    expect((scale.domain as [number, number])[0]).toBeLessThan(0);
  });
});

// ─── devtools ────────────────────────────────────────────────────────────────

describe('devWarn / devError', () => {
  it('exports devWarn and devError without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => devWarn('test warn')).not.toThrow();
    expect(() => devError('test error')).not.toThrow();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

// ─── null-object tooltip/legend ───────────────────────────────────────────────

describe('null-object tooltip/legend', () => {
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

  it('line chart works with no tooltip/legend config (null-objects used)', () => {
    expect(() => {
      const chart = createLineChart(container, {
        series: [{ data: [{ x: 1, y: 5 }], name: 'S' }],
      });

      chart.dispose();
    }).not.toThrow();
  });

  it('area chart works with no tooltip/legend config', () => {
    expect(() => {
      const chart = createAreaChart(container, {
        series: [{ data: [{ x: 1, y: 5 }], name: 'S' }],
      });

      chart.dispose();
    }).not.toThrow();
  });

  it('bar chart works with no tooltip/legend config', () => {
    expect(() => {
      const chart = createBarChart(container, {
        series: [{ data: [{ x: 'A', y: 5 }], name: 'S' }],
      });

      chart.dispose();
    }).not.toThrow();
  });

  it('pie chart works with no tooltip config', () => {
    expect(() => {
      const chart = createPieChart(container, {
        data: [{ label: 'X', value: 100 }],
        transition: { duration: 0 },
      });

      chart.dispose();
    }).not.toThrow();
  });
});

// ─── pie chart — scaffold lifecycle ──────────────────────────────────────────

describe('createPieChart — scaffold lifecycle', () => {
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

  it('renders tooltip inside container when tooltip: true', () => {
    const chart = createPieChart(container, {
      data: [{ value: 100 }],
      tooltip: true,
      transition: { duration: 0 },
    });

    expect(container.querySelector('.prism-tooltip')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-tooltip')).toBeNull();
  });

  it('installs and destroys plugins', () => {
    const install = vi.fn();
    const destroy = vi.fn();
    const chart = createPieChart(container, {
      data: [{ value: 100 }],
      plugins: [{ destroy, install }],
      transition: { duration: 0 },
    });

    expect(install).toHaveBeenCalledWith(chart.el, container);
    chart.dispose();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('reactive signal re-renders slices', async () => {
    const data = signal([{ value: 50 }, { value: 50 }]);
    const chart = createPieChart(container, { data, transition: { duration: 0 } });

    await new Promise((r) => requestAnimationFrame(r));
    expect(chart.el.querySelectorAll('.prism-pie-slice').length).toBe(2);

    data.value = [{ value: 33 }, { value: 33 }, { value: 34 }];
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    expect(chart.el.querySelectorAll('.prism-pie-slice').length).toBe(3);
    chart.dispose();
  });

  it('removes mouse listeners after dispose', () => {
    const chart = createPieChart(container, {
      data: [{ value: 100 }],
      transition: { duration: 0 },
    });
    const svg = chart.el;

    chart.dispose();
    expect(() => svg.dispatchEvent(new MouseEvent('mousemove'))).not.toThrow();
    expect(() => svg.dispatchEvent(new MouseEvent('click'))).not.toThrow();
  });
});

// ─── sparkline — interaction cleanup ─────────────────────────────────────────

describe('createSparkline — interaction cleanup', () => {
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

  it('no stale listeners after dispose', () => {
    const onHover = vi.fn();
    const chart = createSparkline(container, { data: [1, 2, 3], onHover });
    const svg = chart.el;

    chart.dispose();
    svg.dispatchEvent(new MouseEvent('mousemove'));
    expect(onHover).not.toHaveBeenCalled();
  });

  it('reactive signal re-attach interaction correctly', async () => {
    const data = signal([1, 2, 3]);
    const onHover = vi.fn();
    const chart = createSparkline(container, { data, onHover });

    data.value = [1, 2, 3, 4];
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    chart.el.dispatchEvent(new MouseEvent('mouseleave'));
    expect(onHover).toHaveBeenCalledWith(null, null);
    chart.dispose();
  });
});
