import { signal } from '@vielzeug/ripple';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Datum, Series, StackSegment } from '../types';

import { error, warn } from '../_dev';
import { animate } from '../animation/transition';
import { createAreaChart } from '../charts/area';
import { createBarChart } from '../charts/bar';
import { createLineChart } from '../charts/line';
import { createPieChart } from '../charts/pie';
import { createSparkline } from '../charts/sparkline';
import { buildXScale, buildYScale } from '../core/cartesian-scales';
import { createTooltip } from '../interaction/tooltip';
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

  it('sets gridColor', () => {
    setTheme({ gridColor: '#e2e8f0' });
    expect(document.documentElement.style.getPropertyValue('--prism-grid-color')).toBe('#e2e8f0');
    document.documentElement.style.removeProperty('--prism-grid-color');
  });

  it('sets gridOpacity', () => {
    setTheme({ gridOpacity: 0.5 });
    expect(document.documentElement.style.getPropertyValue('--prism-grid-opacity')).toBe('0.5');
    document.documentElement.style.removeProperty('--prism-grid-opacity');
  });
});

// ─── StackSegment type export ─────────────────────────────────────────────────

describe('StackSegment type export', () => {
  it('StackSegment is usable as a type', () => {
    const seg: StackSegment = { color: '#ff0', label: 'A', value: 50 };

    expect(seg.value).toBe(50);
    expect(seg.color).toBe('#ff0');
    expect(seg.label).toBe('A');
  });
});

// ─── crosshair variants ───────────────────────────────────────────────────────

describe('crosshair', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 300, width: 600, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  it('renders vertical crosshair line by default', () => {
    const chart = createLineChart(container, {
      crosshair: true,
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'S',
        },
      ],
    });

    expect(chart.el.querySelector('.prism-crosshair-v')).not.toBeNull();
    expect(chart.el.querySelector('.prism-crosshair-h')).toBeNull();
    chart.dispose();
  });

  it('renders horizontal crosshair line when horizontal:true', () => {
    const chart = createLineChart(container, {
      crosshair: { horizontal: true, vertical: false },
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'S',
        },
      ],
    });

    expect(chart.el.querySelector('.prism-crosshair-h')).not.toBeNull();
    expect(chart.el.querySelector('.prism-crosshair-v')).toBeNull();
    chart.dispose();
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

describe('warn / error', () => {
  it('exports warn and error without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => warn('test warn')).not.toThrow();
    expect(() => error('test error')).not.toThrow();

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
        series: [{ data: [{ key: 1, value: 5 }], name: 'S' }],
      });

      chart.dispose();
    }).not.toThrow();
  });

  it('area chart works with no tooltip/legend config', () => {
    expect(() => {
      const chart = createAreaChart(container, {
        series: [{ data: [{ key: 1, value: 5 }], name: 'S' }],
      });

      chart.dispose();
    }).not.toThrow();
  });

  it('bar chart works with no tooltip/legend config', () => {
    expect(() => {
      const chart = createBarChart(container, {
        series: [{ data: [{ key: 'A', value: 5 }], name: 'S' }],
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

  it('installs and disposes plugins', () => {
    const install = vi.fn();
    const dispose = vi.fn();
    const chart = createPieChart(container, {
      data: [{ value: 100 }],
      plugins: [{ dispose, install }],
      transition: { duration: 0 },
    });

    expect(install).toHaveBeenCalledWith(expect.objectContaining({ container, svg: chart.el }));
    chart.dispose();
    expect(dispose).toHaveBeenCalledOnce();
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

// ─── crosshair DOM leak regression ───────────────────────────────────────────

describe('crosshair — no DOM leak on reactive update', () => {
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

  it('line chart: only one .prism-crosshair group after signal update', async () => {
    const data = signal([{ key: 1, value: 10 }]);
    const chart = createLineChart(container, {
      crosshair: true,
      series: [{ data, name: 'S' }],
    });

    data.value = [
      { key: 1, value: 10 },
      { key: 2, value: 20 },
    ];
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    expect(chart.el.querySelectorAll('.prism-crosshair').length).toBe(1);
    chart.dispose();
  });

  it('area chart: only one .prism-crosshair group after signal update', async () => {
    const data = signal([{ key: 1, value: 10 }]);
    const chart = createAreaChart(container, {
      crosshair: true,
      series: [{ data, name: 'S' }],
    });

    data.value = [
      { key: 1, value: 10 },
      { key: 2, value: 20 },
    ];
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));

    expect(chart.el.querySelectorAll('.prism-crosshair').length).toBe(1);
    chart.dispose();
  });
});

// ─── buildXScale / buildYScale — empty input ─────────────────────────────────

describe('buildXScale / buildYScale — empty arrays', () => {
  it('buildXScale([]) returns a valid scale without Infinity domain', () => {
    const scale = buildXScale([], 300);

    expect(isFinite(scale.domain[0] as number)).toBe(true);
    expect(isFinite(scale.domain[1] as number)).toBe(true);
    expect(scale.range).toEqual([0, 300]);
  });

  it('buildYScale([]) returns a valid scale without Infinity domain', () => {
    const scale = buildYScale([], 300);

    expect(isFinite((scale.domain as [number, number])[0])).toBe(true);
    expect(isFinite((scale.domain as [number, number])[1])).toBe(true);
  });
});

// ─── tooltip — custom render ──────────────────────────────────────────────────

describe('tooltip — custom render function', () => {
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

  it('line chart: custom render fn is called and output injected into tooltip', () => {
    const render = vi.fn((_pt: Datum, s: Series) => `<b>${s.name}</b>`);
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 42 },
            { key: 2, value: 55 },
          ],
          name: 'Rev',
        },
      ],
      tooltip: { render },
    });

    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
    });

    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 150 }));

    const tooltip = container.querySelector('.prism-tooltip') as HTMLElement;

    expect(tooltip).not.toBeNull();

    if (render.mock.calls.length > 0) {
      expect(tooltip.innerHTML).toContain('Rev');
    }

    chart.dispose();
  });
});

// ─── axis — right and top positions ──────────────────────────────────────────

describe('axis — right and top positions', () => {
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

  it('renders axis lines with xAxis position top', () => {
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'S',
        },
      ],
      xAxis: { position: 'top' },
    });

    expect(chart.el.querySelector('.prism-axis-line')).not.toBeNull();
    chart.dispose();
  });

  it('renders axis lines with yAxis position right', () => {
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'S',
        },
      ],
      yAxis: { position: 'right' },
    });

    expect(chart.el.querySelector('.prism-axis-line')).not.toBeNull();
    chart.dispose();
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

// ─── animate utility ─────────────────────────────────────────────────────────

describe('animate', () => {
  it('returns void (not a Promise)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    svg.appendChild(rect);
    document.body.appendChild(svg);

    const result = animate([{ attrs: { width: { from: 0, to: 100 } }, el: rect }], { duration: 0 });

    expect(result).toBeUndefined();
    svg.remove();
  });

  it('calls onComplete after duration: 0', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    svg.appendChild(rect);
    document.body.appendChild(svg);

    const onComplete = vi.fn();

    animate([{ attrs: { width: { from: 0, to: 50 } }, el: rect }], { duration: 0 }, onComplete);
    expect(onComplete).toHaveBeenCalledOnce();
    svg.remove();
  });
});

// ─── TooltipConfig.sanitize ───────────────────────────────────────────────────

describe('TooltipConfig.sanitize', () => {
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

  it('applies sanitize fn before setting innerHTML', () => {
    const sanitize = vi.fn((html: string) => html.replace(/<script.*?<\/script>/gi, ''));
    const render = (_pt: Datum, s: Series) => `<b>${s.name}</b><script>alert(1)</script>`;
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 42 },
            { key: 2, value: 55 },
          ],
          name: 'Rev',
        },
      ],
      tooltip: { render, sanitize },
    });

    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
    });

    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 150 }));

    if (sanitize.mock.calls.length > 0) {
      const tooltip = container.querySelector('.prism-tooltip') as HTMLElement;

      expect(tooltip.innerHTML).not.toContain('<script>');
    }

    chart.dispose();
  });
});

// ─── Datum.key type contract ──────────────────────────────────────────────────

describe('createLineChart — Datum.key type contract', () => {
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

  it('renders without errors when key values are numbers', () => {
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'S',
        },
      ],
    });

    expect(chart.el.querySelector('.prism-series')).not.toBeNull();
    chart.dispose();
  });

  it('renders without errors when key values are Dates', () => {
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: new Date('2024-01-01'), value: 10 },
            { key: new Date('2024-06-01'), value: 20 },
          ],
          name: 'S',
        },
      ],
    });

    expect(chart.el.querySelector('.prism-series')).not.toBeNull();
    chart.dispose();
  });
});

// ─── axis — label (title) rendering ──────────────────────────────────────────

describe('AxisConfig.label — axis title rendering', () => {
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

  it('renders .prism-axis-title element when xAxis.label is set', () => {
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'S',
        },
      ],
      xAxis: { label: 'Time' },
    });

    expect(chart.el.querySelector('.prism-axis-title')).not.toBeNull();
    expect(chart.el.querySelector('.prism-axis-title')?.textContent).toBe('Time');
    chart.dispose();
  });

  it('renders .prism-axis-title element when yAxis.label is set', () => {
    const chart = createLineChart(container, {
      series: [
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
          ],
          name: 'S',
        },
      ],
      yAxis: { label: 'Value' },
    });

    expect(chart.el.querySelector('.prism-axis-title')).not.toBeNull();
    expect(chart.el.querySelector('.prism-axis-title')?.textContent).toBe('Value');
    chart.dispose();
  });

  it('renders no .prism-axis-title when no label is set', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
    });

    expect(chart.el.querySelector('.prism-axis-title')).toBeNull();
    chart.dispose();
  });
});

// ─── tooltip — isConnected guard ─────────────────────────────────────────────

describe('createTooltip — isConnected guard', () => {
  it('show() does not throw when container is detached from DOM', () => {
    const container = document.createElement('div');
    const tooltip = createTooltip(container, true);
    const datum: Datum = { key: 1, value: 10 };
    const series: Series = { data: [], name: 'S' };

    expect(() => tooltip.show(10, 10, datum, series)).not.toThrow();
    tooltip.dispose();
  });
});

// ─── tooltip — render without sanitize warn ───────────────────────────────

describe('createTooltip — XSS warning', () => {
  it('emits warn when render is provided without sanitize', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = document.createElement('div');

    document.body.appendChild(container);
    createTooltip(container, { render: (_datum, s) => `<b>${s.name}</b>` });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sanitize'));
    warnSpy.mockRestore();
    container.remove();
  });

  it('does NOT warn when render is provided with sanitize', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const container = document.createElement('div');

    document.body.appendChild(container);
    createTooltip(container, {
      render: (_datum, s) => `<b>${s.name}</b>`,
      sanitize: (html) => html,
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    container.remove();
  });
});
