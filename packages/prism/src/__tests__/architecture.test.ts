import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { error, warn } from '../_dev';
import { animate } from '../animation/transition';
import { createAreaChart } from '../charts/area';
import { createBarChart } from '../charts/bar';
import { createLineChart } from '../charts/line';
import { createPieChart } from '../charts/pie';
import { createSparkline } from '../charts/sparkline';
import { buildXScale, buildYScale } from '../core/cartesian-scales';
import { createTooltip } from '../interaction/tooltip';
import { resetTheme, seriesColor, setTheme } from '../theme';
import type { Datum, Series, StackSegment } from '../types';

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
  afterEach(() => resetTheme());

  it('sets --prism-color-N custom properties on documentElement', () => {
    setTheme({ colors: ['#aaa', '#bbb'] });
    expect(document.documentElement.style.getPropertyValue('--prism-color-1')).toBe('#aaa');
    expect(document.documentElement.style.getPropertyValue('--prism-color-2')).toBe('#bbb');
  });

  it('sets font-family', () => {
    setTheme({ fontFamily: 'sans-serif' });
    expect(document.documentElement.style.getPropertyValue('--prism-font-family')).toBe('sans-serif');
  });

  it('sets gridColor', () => {
    setTheme({ gridColor: '#e2e8f0' });
    expect(document.documentElement.style.getPropertyValue('--prism-grid-color')).toBe('#e2e8f0');
  });

  it('sets gridOpacity', () => {
    setTheme({ gridOpacity: 0.5 });
    expect(document.documentElement.style.getPropertyValue('--prism-grid-opacity')).toBe('0.5');
  });

  it('clears stale higher-index colors when a later call has fewer colors (D3)', () => {
    setTheme({ colors: ['#111', '#222', '#333'] });
    setTheme({ colors: ['#aaa'] });

    expect(document.documentElement.style.getPropertyValue('--prism-color-1')).toBe('#aaa');
    expect(document.documentElement.style.getPropertyValue('--prism-color-2')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--prism-color-3')).toBe('');
  });
});

describe('resetTheme', () => {
  it('clears every custom property setTheme() can set', () => {
    setTheme({ colors: ['#aaa'], fontFamily: 'sans-serif', gridColor: '#e2e8f0', gridOpacity: 0.5 });
    resetTheme();

    const style = document.documentElement.style;

    expect(style.getPropertyValue('--prism-color-1')).toBe('');
    expect(style.getPropertyValue('--prism-font-family')).toBe('');
    expect(style.getPropertyValue('--prism-grid-color')).toBe('');
    expect(style.getPropertyValue('--prism-grid-opacity')).toBe('');
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

  it('snap:false follows the raw mouse position instead of the nearest datum (B11)', () => {
    const chart = createLineChart(container, {
      crosshair: { snap: false },
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

    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
    });

    // margin.left=50, so raw area-local x = clientX - marginLeft = 300 - 50 = 250 —
    // roughly midway between the two data points (area-local x=0 and x=530), which
    // snap:true would instead round to the nearer datum (x=0).
    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 150 }));

    const vLine = chart.el.querySelector('.prism-crosshair-v');

    expect(Number(vLine?.getAttribute('x1'))).toBeCloseTo(250, 0);
    chart.dispose();
  });

  it('snap:true (default) snaps to the nearest datum, not the raw mouse position (B11)', () => {
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

    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
    });

    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 150 }));

    const vLine = chart.el.querySelector('.prism-crosshair-v');

    // Nearest datum to area-local x=250 is the first point at area-local x=0.
    expect(Number(vLine?.getAttribute('x1'))).toBeCloseTo(0, 0);
    chart.dispose();
  });

  it('marks the crosshair group as aria-hidden (B15 — decorative)', () => {
    const chart = createLineChart(container, {
      crosshair: true,
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
    });

    expect(chart.el.querySelector('.prism-crosshair')?.getAttribute('aria-hidden')).toBe('true');
    chart.dispose();
  });

  it('exposes a role="status"/aria-live="polite" live region announcing the snapped value (B14)', () => {
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

    const liveRegion = chart.el.querySelector('.prism-crosshair-live');

    expect(liveRegion?.getAttribute('role')).toBe('status');
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');

    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 100 }));

    expect(liveRegion?.textContent).toContain('S:');
    chart.dispose();
  });

  it('clears the crosshair live region on mouseleave (Lens A fix)', () => {
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

    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200, clientY: 100 }));

    const liveRegion = chart.el.querySelector('.prism-crosshair-live');

    expect(liveRegion?.textContent).toContain('S:');

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(liveRegion?.textContent).toBe('');
    chart.dispose();
  });
});

// ─── decorative sub-elements — aria-hidden (B15) ───────────────────────────────

describe('decorative sub-elements — aria-hidden (B15)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 300, width: 600, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  it('marks grid, axis line, tick lines, and tick labels as aria-hidden, but not the axis title', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
      xAxis: { grid: true, label: 'Time' },
      yAxis: { label: 'Value' },
    });

    expect(chart.el.querySelector('.prism-grid')?.getAttribute('aria-hidden')).toBe('true');
    expect(chart.el.querySelector('.prism-axis-line')?.getAttribute('aria-hidden')).toBe('true');
    expect(chart.el.querySelector('.prism-axis-tick')?.getAttribute('aria-hidden')).toBe('true');
    expect(chart.el.querySelector('.prism-axis-label')?.getAttribute('aria-hidden')).toBe('true');
    expect(chart.el.querySelector('.prism-axis-title')?.hasAttribute('aria-hidden')).toBe(false);
    chart.dispose();
  });
});

// ─── tooltip — ARIA live region (B14) ───────────────────────────────────────────

describe('tooltip — ARIA live region (B14)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 300, width: 600, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  it('tooltip element has role="status" and aria-live="polite"', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
      tooltip: true,
    });

    const tooltipEl = chart.el.parentElement?.querySelector('.prism-tooltip');

    expect(tooltipEl?.getAttribute('role')).toBe('status');
    expect(tooltipEl?.getAttribute('aria-live')).toBe('polite');
    chart.dispose();
  });

  it('restores the container position on dispose', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
      tooltip: true,
    });

    expect(container.style.position).toBe('relative');
    chart.dispose();
    expect(container.style.position).toBe('');
  });

  it('reveals the tooltip on the next animation frame', async () => {
    const tooltip = createTooltip(container, true);

    tooltip.show(10, 10, { key: 1, value: 10 }, { data: [], name: 'S' });

    expect(tooltip.el?.style.opacity).toBe('0');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(tooltip.el?.style.opacity).toBe('1');
    tooltip.dispose();
  });

  it('clears tooltip text after its exit fade completes', async () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
      tooltip: true,
    });

    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
    });

    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 300, clientY: 150 }));

    const tooltipEl = chart.el.parentElement?.querySelector('.prism-tooltip') as HTMLElement;

    expect(tooltipEl.textContent).toContain('S:');

    chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(tooltipEl.textContent).toContain('S:');
    await new Promise((resolve) => setTimeout(resolve, 160));
    expect(tooltipEl.textContent).toBe('');
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

  it('updates pie data explicitly', () => {
    const chart = createPieChart(container, {
      data: [{ value: 50 }, { value: 50 }],
      transition: { duration: 0 },
    });

    expect(chart.el.querySelectorAll('.prism-pie-slice')).toHaveLength(2);
    chart.update([{ value: 33 }, { value: 33 }, { value: 34 }]);
    expect(chart.el.querySelectorAll('.prism-pie-slice')).toHaveLength(3);
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

describe('crosshair — no DOM leak on update', () => {
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

  it('line chart: only one .prism-crosshair group after update', () => {
    const chart = createLineChart(container, {
      crosshair: true,
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
    });

    chart.update([
      {
        data: [
          { key: 1, value: 10 },
          { key: 2, value: 20 },
        ],
        name: 'S',
      },
    ]);

    expect(chart.el.querySelectorAll('.prism-crosshair')).toHaveLength(1);
    chart.dispose();
  });

  it('area chart: only one .prism-crosshair group after update', () => {
    const chart = createAreaChart(container, {
      crosshair: true,
      series: [{ data: [{ key: 1, value: 10 }], name: 'S' }],
    });

    chart.update([
      {
        data: [
          { key: 1, value: 10 },
          { key: 2, value: 20 },
        ],
        name: 'S',
      },
    ]);

    expect(chart.el.querySelectorAll('.prism-crosshair')).toHaveLength(1);
    chart.dispose();
  });
});

// ─── buildXScale / buildYScale — empty input ─────────────────────────────────

describe('buildXScale / buildYScale — empty arrays', () => {
  it('buildXScale([]) returns a valid scale without Infinity domain', () => {
    const scale = buildXScale([], 300);

    expect(Number.isFinite(scale.domain[0] as number)).toBe(true);
    expect(Number.isFinite(scale.domain[1] as number)).toBe(true);
    expect(scale.range).toEqual([0, 300]);
  });

  it('buildYScale([]) returns a valid scale without Infinity domain', () => {
    const scale = buildYScale([], 300);

    expect(Number.isFinite((scale.domain as [number, number])[0])).toBe(true);
    expect(Number.isFinite((scale.domain as [number, number])[1])).toBe(true);
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
    expect(render).toHaveBeenCalled();
    expect(tooltip.textContent).toContain('Rev');

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

    expect(chart.el.querySelector('.prism-x-axis')?.hasAttribute('transform')).toBe(false);
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

    expect(chart.el.querySelector('.prism-y-axis')?.getAttribute('transform')).toBe('translate(530,0)');
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

  it('re-attaches interaction after update', () => {
    const onHover = vi.fn();
    const chart = createSparkline(container, { data: [1, 2, 3], onHover });

    chart.update([1, 2, 3, 4]);
    chart.el.dispatchEvent(new MouseEvent('mouseleave'));
    expect(onHover).toHaveBeenCalledWith(null, null);
    chart.dispose();
  });
});

// ─── animate utility ─────────────────────────────────────────────────────────

describe('animate', () => {
  it('returns a cancel function (not a Promise)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    svg.appendChild(rect);
    document.body.appendChild(svg);

    const result = animate([{ attrs: { width: { from: 0, to: 100 } }, el: rect }], { duration: 0 });

    expect(typeof result).toBe('function');
    expect(result).not.toBeInstanceOf(Promise);
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

describe('TooltipConfig.render', () => {
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

  it('mounts returned nodes', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 42 }], name: 'Revenue' }],
      tooltip: {
        render: (_datum, series) => {
          const content = document.createElement('strong');

          content.textContent = series.name;
          return content;
        },
      },
    });

    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
    });
    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 150 }));

    expect(container.querySelector('.prism-tooltip strong')?.textContent).toBe('Revenue');
    chart.dispose();
  });

  it('renders strings as text', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 42 }], name: 'Revenue' }],
      tooltip: { render: (_datum, series) => `<img src=x>${series.name}` },
    });

    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
    });
    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 150 }));

    const tooltip = container.querySelector('.prism-tooltip') as HTMLElement;

    expect(tooltip.querySelector('img')).toBeNull();
    expect(tooltip.textContent).toContain('Revenue');
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
