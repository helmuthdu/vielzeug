import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAreaChart } from '../charts/area';
import { createBarChart } from '../charts/bar';
import { createLineChart } from '../charts/line';
import { createPieChart } from '../charts/pie';
import { createSparkline } from '../charts/sparkline';
import type { ChartEvent, ChartHandle, ContinuousDatum } from '../types';

const series = (name: string, values: number[]) => ({
  data: values.map((value, i): ContinuousDatum => ({ key: i + 1, value })),
  name,
});

const ANA = series('Ana', [3, 5, 4]);
const BROM = series('Brom', [6, 2, 7]);

const BAR_SERIES = [
  {
    data: [
      { key: 'Str', value: 8 },
      { key: 'Agi', value: 6 },
    ],
    name: 'Ana',
  },
  {
    data: [
      { key: 'Str', value: 5 },
      { key: 'Agi', value: 9 },
    ],
    name: 'Brom',
  },
];

describe('chart interaction standard', () => {
  let container: HTMLElement;

  const press = (chart: ChartHandle<unknown>, key: string) =>
    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));

  const hover = (chart: ChartHandle<unknown>, clientX: number, clientY: number) => {
    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
    });
    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }));
  };

  const live = (chart: ChartHandle<unknown>) => chart.el.querySelector('.prism-live')?.textContent;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 300, left: 0, top: 0, width: 600, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  describe.each([
    ['line', createLineChart],
    ['area', createAreaChart],
  ] as const)('%s chart', (_, create) => {
    it('announces every series at the focused key from the keyboard', () => {
      const chart = create(container, { series: [ANA, BROM] });

      press(chart, 'ArrowRight');
      expect(live(chart)).toBe('1: Ana 3, Brom 6');
      press(chart, 'End');
      expect(live(chart)).toBe('3: Ana 4, Brom 7');
      press(chart, 'Home');
      expect(live(chart)).toBe('1: Ana 3, Brom 6');
      chart.dispose();
    });

    it('reports every series value on hover', () => {
      const onHover = vi.fn();
      const chart = create(container, { onHover, series: [ANA, BROM] });

      hover(chart, 50, 150);

      const event: ChartEvent = onHover.mock.calls.at(-1)![0];

      expect(event.values?.map((v) => v.datum?.value)).toEqual([3, 6]);
      chart.dispose();
    });

    it('marks every series at the active key and dims all but the nearest', () => {
      const chart = create(container, { series: [ANA, BROM] });

      press(chart, 'ArrowRight');

      const seriesGroup = chart.el.querySelector('.prism-series');

      expect(chart.el.querySelectorAll('.prism-active-point')).toHaveLength(2);
      expect(seriesGroup?.classList.contains('prism-series-focused')).toBe(true);
      expect(seriesGroup?.querySelectorAll('.prism-series-active')).toHaveLength(1);
      chart.dispose();
    });

    it('clears the active state with Escape', () => {
      const onHover = vi.fn();
      const chart = create(container, { onHover, series: [ANA, BROM] });

      press(chart, 'ArrowRight');
      press(chart, 'Escape');

      expect(live(chart)).toBe('');
      expect(chart.el.querySelector('.prism-active-point')).toBeNull();
      expect(chart.el.querySelector('.prism-series-focused')).toBeNull();
      expect(onHover).toHaveBeenLastCalledWith(null);
      chart.dispose();
    });

    it('shows a comparison tooltip with a row per series and a spoken summary', () => {
      const chart = create(container, { series: [ANA, BROM], tooltip: true });

      press(chart, 'ArrowRight');

      const rows = [...container.querySelectorAll('.prism-tooltip-row')].map((row) => row.textContent);

      expect(container.querySelector('.prism-tooltip-title')?.textContent).toBe('1');
      expect(rows).toEqual(['Ana3', 'Brom6']);
      expect(container.querySelector('.prism-tooltip-sr')?.textContent).toBe('1: Ana 3, Brom 6');
      expect(live(chart)).toBe('');
      chart.dispose();
    });

    it('keeps a single live region even with a crosshair', () => {
      const chart = create(container, { crosshair: true, series: [ANA] });

      expect(chart.el.querySelectorAll('[aria-live]')).toHaveLength(1);
      chart.dispose();
    });

    it('passes the axe audit while a key is active', async () => {
      const chart = create(container, {
        a11y: { ariaLabel: 'Comparison' },
        crosshair: true,
        legend: true,
        series: [ANA, BROM],
        tooltip: true,
      });

      press(chart, 'ArrowRight');

      const results = await axeCheck(container);

      expect(results.violations).toHaveLength(0);
      chart.dispose();
    });
  });

  describe('line chart styling', () => {
    it('lets an explicit strokeWidth override the theme token', () => {
      const chart = createLineChart(container, { series: [{ ...ANA, strokeWidth: 4 }, BROM] });
      const [custom, themed] = [...chart.el.querySelectorAll<SVGPathElement>('.prism-line-path')];

      expect(custom.style.strokeWidth).toBe('4');
      expect(themed.style.strokeWidth).toBe('');
      chart.dispose();
    });
  });

  describe('area chart fill', () => {
    it('fills with a vertical gradient by default, unique per series and chart', () => {
      const first = createAreaChart(container, { series: [ANA, BROM] });
      const second = createAreaChart(container, { series: [ANA] });
      const ids = [first, second].flatMap((c) => [...c.el.querySelectorAll('linearGradient')].map((g) => g.id));

      expect(first.el.querySelector('.prism-area-fill')?.getAttribute('fill')).toBe(`url(#${ids[0]})`);
      expect(new Set(ids).size).toBe(3);
      first.dispose();
      second.dispose();
    });

    it('uses a flat fill when fill is solid, with explicit opacity winning over the theme', () => {
      const chart = createAreaChart(container, { series: [{ ...ANA, fill: 'solid', fillOpacity: 0.5 }] });
      const fill = chart.el.querySelector<SVGPathElement>('.prism-area-fill');

      expect(chart.el.querySelector('linearGradient')).toBeNull();
      expect(fill?.classList.contains('prism-area-fill--solid')).toBe(true);
      expect(fill?.style.fillOpacity).toBe('0.5');
      chart.dispose();
    });

    it('drops the gradient when a series switches to solid', () => {
      const chart = createAreaChart(container, { series: [ANA] });

      chart.update([{ ...ANA, fill: 'solid' }]);
      expect(chart.el.querySelector('linearGradient')).toBeNull();
      chart.dispose();
    });
  });

  describe('bar chart', () => {
    it('announces every series in the focused category', () => {
      const chart = createBarChart(container, { series: BAR_SERIES });

      press(chart, 'ArrowRight');
      expect(live(chart)).toBe('Str: Ana 8, Brom 5');
      press(chart, 'ArrowRight');
      expect(live(chart)).toBe('Agi: Ana 6, Brom 9');
      chart.dispose();
    });

    it('highlights the focused category band and dims the others', () => {
      const chart = createBarChart(container, { series: BAR_SERIES });
      const band = chart.el.querySelector<SVGRectElement>('.prism-bar-band');

      expect(band?.style.display).toBe('none');
      press(chart, 'ArrowRight');

      expect(band?.style.display).toBe('');
      expect(chart.el.querySelector('.prism-series')?.classList.contains('prism-bars-focused')).toBe(true);
      expect(chart.el.querySelectorAll('.prism-bar--active')).toHaveLength(2);
      chart.dispose();
    });

    it('reports the category values on hover, even above the bars', () => {
      const onHover = vi.fn();
      const chart = createBarChart(container, { onHover, series: BAR_SERIES });

      hover(chart, 100, 25);

      expect(onHover.mock.calls.at(-1)![0].values.map((v: { datum?: { value: number } }) => v.datum?.value)).toEqual([
        8, 5,
      ]);
      chart.dispose();
    });

    it('activates the focused category with Enter', () => {
      const onClick = vi.fn();
      const chart = createBarChart(container, { onClick, series: BAR_SERIES });

      press(chart, 'End');
      press(chart, 'Enter');
      expect(onClick.mock.calls[0][0].datum).toEqual({ key: 'Agi', value: 6 });
      chart.dispose();
    });

    it('rounds bars from the theme token and keeps stacked bars square', () => {
      container.style.setProperty('--prism-bar-radius', '6px');

      const grouped = createBarChart(container, { series: BAR_SERIES });

      expect(grouped.el.querySelector('.prism-bar')?.getAttribute('rx')).toBe('6');
      grouped.dispose();

      const stacked = createBarChart(container, { series: BAR_SERIES, variant: 'stacked' });

      expect(stacked.el.querySelector('.prism-bar')?.getAttribute('rx')).toBe('0');
      stacked.dispose();
    });

    it('labels every category when the labels fit', () => {
      const chart = createBarChart(container, {
        series: [{ data: ['Str', 'Agi', 'Int', 'Wil', 'End'].map((key) => ({ key, value: 5 })), name: 'Ana' }],
        xAxis: {},
      });
      const labels = [...chart.el.querySelectorAll('.prism-x-axis .prism-axis-label')].map((el) => el.textContent);

      expect(labels).toEqual(['Str', 'Agi', 'Int', 'Wil', 'End']);
      chart.dispose();
    });

    it('thins category labels only when they would overlap', () => {
      const keys = Array.from({ length: 30 }, (_, i) => `Category number ${i}`);
      const chart = createBarChart(container, {
        series: [{ data: keys.map((key) => ({ key, value: 5 })), name: 'Ana' }],
        xAxis: {},
      });
      const count = chart.el.querySelectorAll('.prism-x-axis .prism-axis-label').length;

      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(keys.length);
      chart.dispose();
    });

    it('passes the axe audit while a category is active', async () => {
      const chart = createBarChart(container, {
        a11y: { ariaLabel: 'Stats' },
        legend: true,
        series: BAR_SERIES,
        tooltip: true,
      });

      press(chart, 'ArrowRight');

      const results = await axeCheck(container);

      expect(results.violations).toHaveLength(0);
      chart.dispose();
    });
  });

  describe('pie chart', () => {
    const SLICES = [
      { label: 'Wins', value: 15 },
      { label: 'Losses', value: 4 },
      { label: 'Draws', value: 1 },
    ];

    it('steps through slices from the keyboard, announcing value and share', () => {
      const chart = createPieChart(container, { data: SLICES, transition: { duration: 0 } });

      press(chart, 'ArrowRight');
      expect(live(chart)).toBe('Wins: 15 (75%)');
      press(chart, 'ArrowLeft');
      expect(live(chart)).toBe('Draws: 1 (5%)');
      chart.dispose();
    });

    it('emphasises the active slice and dims the rest', () => {
      const chart = createPieChart(container, { data: SLICES, transition: { duration: 0 } });

      press(chart, 'ArrowRight');

      expect(chart.el.querySelector('.prism-pie-slices')?.classList.contains('prism-pie-focused')).toBe(true);
      expect(chart.el.querySelectorAll('.prism-pie-slice--active')).toHaveLength(1);
      press(chart, 'Escape');
      expect(chart.el.querySelector('.prism-pie-focused')).toBeNull();
      chart.dispose();
    });

    it('activates the focused slice with Enter', () => {
      const onClick = vi.fn();
      const chart = createPieChart(container, { data: SLICES, onClick, transition: { duration: 0 } });

      press(chart, 'ArrowRight');
      press(chart, 'Enter');
      expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ index: 0, slice: SLICES[0] }));
      chart.dispose();
    });

    it('omits labels that do not fit inside their slice', () => {
      const chart = createPieChart(container, { data: SLICES, transition: { duration: 0 }, variant: 'donut' });
      const labels = [...chart.el.querySelectorAll('.prism-pie-label')].map((el) => el.textContent);

      expect(labels).toContain('Wins');
      expect(labels).not.toContain('Draws');
      chart.dispose();
    });
  });

  describe('sparkline', () => {
    it('fills the area variant with a gradient and marks the latest value', () => {
      const chart = createSparkline(container, { data: [1, 4, 2, 6], variant: 'area' });
      const fill = chart.el.querySelector('.prism-spark-fill');
      const gradient = chart.el.querySelector('linearGradient');

      expect(fill?.getAttribute('fill')).toBe(`url(#${gradient?.id})`);
      expect(chart.el.querySelector('.prism-spark-end')).not.toBeNull();
      chart.dispose();
    });

    it('hides the end point when showEndPoint is false', () => {
      const chart = createSparkline(container, { data: [1, 4, 2], showEndPoint: false });

      expect(chart.el.querySelector('.prism-spark-end')).toBeNull();
      chart.dispose();
    });

    it('follows the hovered value with a marker', () => {
      const chart = createSparkline(container, { data: [1, 4, 2], onHover: () => {} });
      const marker = chart.el.querySelector<SVGCircleElement>('.prism-spark-marker');
      const inset = Number(
        /translate\(([\d.]+)/.exec(chart.el.querySelector('.prism-spark-inner')?.getAttribute('transform') ?? '')?.[1],
      );

      hover(chart, 300, 10);
      expect(marker?.style.display).toBe('');
      expect(Number(marker?.getAttribute('cx')) + inset).toBe(300);
      chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      expect(marker?.style.display).toBe('none');
      chart.dispose();
    });

    it('insets the line so the end point is not clipped at the edge', () => {
      const chart = createSparkline(container, { data: [1, 4, 6] });
      const end = chart.el.querySelector('.prism-spark-end');
      const inset = Number(
        /translate\(([\d.]+)/.exec(chart.el.querySelector('.prism-spark-inner')?.getAttribute('transform') ?? '')?.[1],
      );

      expect(inset).toBeGreaterThan(Number(end?.getAttribute('r')));
      expect(Number(end?.getAttribute('cx')) + inset).toBeLessThan(600);
      chart.dispose();
    });

    it('warns about non-finite values', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const chart = createSparkline(container, { data: [1, Number.NaN, 2] });

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('non-finite'));
      chart.dispose();
    });
  });
});
