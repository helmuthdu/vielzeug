import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAreaChart } from '../charts/area';
import { createBarChart } from '../charts/bar';
import { createLineChart } from '../charts/line';
import { createTooltip } from '../interaction/tooltip';
import type { ContinuousDatum } from '../types';

const rect = (width: number, height: number) => ({
  height,
  left: 0,
  top: 0,
  width,
  x: 0,
  y: 0,
});

const series = (name: string, values: number[]) => ({
  data: values.map((value, i): ContinuousDatum => ({ key: i, value })),
  name,
});

describe('axis tickValues', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(600, 300) });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  const labels = (chart: { el: Element }, selector: string) =>
    [...chart.el.querySelectorAll(`${selector} .prism-axis-label`)].map((el) => el.textContent);

  it('renders exactly the requested ticks on a linear axis', () => {
    const chart = createLineChart(container, {
      series: [series('S', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])],
      xAxis: { tickValues: [0, 6, 11] },
    });

    expect(labels(chart, '.prism-x-axis')).toEqual(['0', '6', '11']);
    chart.dispose();
  });

  it('leaves scale-generated ticks untouched when tickValues is absent', () => {
    const chart = createLineChart(container, {
      series: [series('S', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])],
      xAxis: {},
    });

    expect(labels(chart, '.prism-x-axis')).not.toEqual(['0', '6', '11']);
    chart.dispose();
  });

  it('keeps gridlines aligned with explicit tickValues', () => {
    const chart = createLineChart(container, {
      series: [series('S', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])],
      xAxis: { grid: true, tickValues: [0, 6, 11] },
    });

    const gridLines = [...chart.el.querySelectorAll('.prism-grid-line')].map((line) => line.getAttribute('x1'));
    const ticks = [...chart.el.querySelectorAll('.prism-x-axis .prism-axis-tick')].map((tick) =>
      tick.getAttribute('x1'),
    );

    expect(gridLines).toEqual(ticks);
    chart.dispose();
  });

  it('renders explicit category ticks on a band axis', () => {
    const chart = createBarChart(container, {
      series: [{ data: ['a', 'b', 'c', 'd'].map((key) => ({ key, value: 5 })), name: 'S' }],
      xAxis: { tickValues: ['a', 'd'] },
    });

    expect(labels(chart, '.prism-x-axis')).toEqual(['a', 'd']);
    chart.dispose();
  });

  it('warns when a tickValue is not a band category', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const chart = createBarChart(container, {
      series: [{ data: ['a', 'b'].map((key) => ({ key, value: 5 })), name: 'S' }],
      xAxis: { tickValues: ['a', 'missing'] },
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"missing" is not a category'));
    chart.dispose();
  });

  it('warns when a numeric tickValue is outside the axis domain', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const chart = createLineChart(container, {
      series: [series('S', [0, 10])],
      xAxis: { tickValues: [5, 9999] },
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"9999" is outside the axis domain'));
    chart.dispose();
  });

  it('does not warn when every tickValue is on scale', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const chart = createLineChart(container, {
      series: [series('S', [0, 10])],
      xAxis: { tickValues: [0, 0.5, 1] },
    });

    expect(warnSpy).not.toHaveBeenCalled();
    chart.dispose();
  });
});

describe('value-axis default merge', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(600, 300) });
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  it('keeps gridlines when a line chart supplies only tickFormat', () => {
    const chart = createLineChart(container, {
      series: [series('S', [1, 2, 3])],
      yAxis: { tickFormat: (v) => `${String(v)}!` },
    });

    expect(chart.el.querySelector('.prism-grid-line')).not.toBeNull();
    expect(chart.el.querySelector('.prism-y-axis .prism-axis-label')?.textContent).toBe('0!');
    chart.dispose();
  });

  it('keeps gridlines when an area chart supplies only tickFormat', () => {
    const chart = createAreaChart(container, {
      series: [series('S', [1, 2, 3])],
      yAxis: { tickFormat: String },
    });

    expect(chart.el.querySelector('.prism-grid-line')).not.toBeNull();
    chart.dispose();
  });

  it('keeps gridlines on a vertical bar chart that supplies only tickFormat', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'a', value: 5 }], name: 'S' }],
      yAxis: { tickFormat: String },
    });

    expect(chart.el.querySelector('.prism-grid-line')).not.toBeNull();
    chart.dispose();
  });

  it('keeps gridlines on a horizontal bar chart whose value axis is xAxis', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'a', value: 5 }], name: 'S' }],
      variant: 'grouped-horizontal',
      xAxis: { tickFormat: String },
    });

    expect(chart.el.querySelector('.prism-grid-line')).not.toBeNull();
    chart.dispose();
  });

  it('still honors grid: false over the default', () => {
    const chart = createLineChart(container, {
      series: [series('S', [1, 2, 3])],
      yAxis: { grid: false },
    });

    expect(chart.el.querySelector('.prism-grid-line')).toBeNull();
    chart.dispose();
  });
});

describe('compact default tick format', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(600, 300) });
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  const yLabels = (chart: { el: Element }) =>
    [...chart.el.querySelectorAll('.prism-y-axis .prism-axis-label')].map((el) => el.textContent);

  it('renders large magnitudes in compact notation', () => {
    const chart = createLineChart(container, {
      series: [series('S', [0, 1_234_567])],
    });

    expect(yLabels(chart)).toEqual(['0', '500K', '1M']);
    chart.dispose();
  });

  it('leaves small magnitudes as plain strings', () => {
    const chart = createLineChart(container, {
      series: [series('S', [0, 9_999])],
    });

    expect(yLabels(chart)).toEqual(['0', '5000', '10000']);
    chart.dispose();
  });

  it('opting out with tickFormat: String restores raw labels', () => {
    const chart = createLineChart(container, {
      series: [series('S', [0, 1_234_567])],
      yAxis: { tickFormat: String },
    });

    expect(yLabels(chart)).toEqual(['0', '500000', '1000000']);
    chart.dispose();
  });

  it('compacts negative magnitudes too', () => {
    const chart = createLineChart(container, {
      series: [series('S', [-250_000, 0])],
    });

    expect(yLabels(chart)).toEqual(['-200K', '0']);
    chart.dispose();
  });
});

describe('tooltip title and value formatters', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(600, 300) });
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  const press = (chart: { el: Element; dispose(): void }, key: string) =>
    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));

  const tooltip = (containerEl: HTMLElement) => ({
    rows: [...containerEl.querySelectorAll('.prism-tooltip-row')].map((row) => row.textContent),
    spoken: containerEl.querySelector('.prism-tooltip-sr')?.textContent,
    title: containerEl.querySelector('.prism-tooltip-title')?.textContent,
  });

  it('formats the line tooltip title and rows', () => {
    const chart = createLineChart(container, {
      series: [series('EC2', [128_000, 200_000])],
      tooltip: {
        titleFormat: (key) => `month-${String(key)}`,
        valueFormat: (value) => `${String(Math.round(value / 1000))}K`,
      },
    });

    press(chart, 'Home');

    expect(tooltip(container).title).toBe('month-0');
    expect(tooltip(container).rows).toEqual(['EC2128K']);
    chart.dispose();
  });

  it('keeps the spoken summary consistent with the formatted rows', () => {
    const chart = createLineChart(container, {
      series: [series('EC2', [128_000, 200_000])],
      tooltip: {
        titleFormat: (key) => `month-${String(key)}`,
        valueFormat: (value) => `${String(Math.round(value / 1000))}K`,
      },
    });

    press(chart, 'Home');

    expect(tooltip(container).spoken).toBe('month-0: EC2 128K');
    chart.dispose();
  });

  it('formats bar tooltip titles from the original datum key', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 11, value: 128_000 }], name: 'EC2' }],
      tooltip: {
        titleFormat: (key) => (Number(key) === 11 ? 'Dec' : String(key)),
        valueFormat: (value) => `${String(Math.round(value / 1000))}K`,
      },
    });

    press(chart, 'ArrowRight');

    expect(tooltip(container).title).toBe('Dec');
    expect(tooltip(container).rows).toEqual(['EC2128K']);
    chart.dispose();
  });

  it('leaves default content untouched when no formatter is set', () => {
    const chart = createLineChart(container, {
      series: [series('EC2', [128_000])],
      tooltip: true,
    });

    press(chart, 'Home');

    expect(tooltip(container).title).toBe('0');
    expect(tooltip(container).rows).toEqual(['EC2128000']);
    chart.dispose();
  });

  it('keeps render precedence over the formatters', () => {
    const chart = createLineChart(container, {
      series: [series('EC2', [128_000])],
      tooltip: {
        render: () => 'custom',
        valueFormat: () => 'ignored',
      },
    });

    press(chart, 'Home');

    expect(container.querySelector('.prism-tooltip')?.textContent).toBe('custom');
    chart.dispose();
  });
});

describe('tooltip container clamping', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => container.remove());

  it('shifts the tooltip so it stays inside the container at the right edge', () => {
    Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(200, 100) });
    const tooltipState = createTooltip(container, true);

    tooltipState.show(195, 50, { key: 1, value: 10 }, { data: [], name: 'S' }, 'wide tooltip content');

    const el = container.querySelector('.prism-tooltip') as HTMLElement;

    Object.defineProperty(el, 'getBoundingClientRect', { value: () => rect(120, 40) });
    tooltipState.show(195, 50, { key: 1, value: 10 }, { data: [], name: 'S' }, 'wide tooltip content');

    const left = Number.parseFloat(el.style.left);

    expect(left + 120).toBeLessThanOrEqual(200 + 8);
    tooltipState.dispose();
  });

  it('clamps to a clipping ancestor smaller than the container', () => {
    const wrapper = document.createElement('div');

    wrapper.style.overflow = 'hidden';
    Object.defineProperty(wrapper, 'getBoundingClientRect', { value: () => rect(100, 100) });
    Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(400, 100) });
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);

    const tooltipState = createTooltip(container, true);

    Object.defineProperty(tooltipState.el, 'getBoundingClientRect', { value: () => rect(60, 30) });
    tooltipState.show(380, 50, { key: 1, value: 10 }, { data: [], name: 'S' }, 'content');

    const left = Number.parseFloat(tooltipState.el.style.left);

    expect(left + 60).toBeLessThanOrEqual(100 + 8);
    tooltipState.dispose();
    wrapper.remove();
  });
});
