import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHeatmapChart } from '../charts/heatmap';
import { valueColorFor } from '../charts/heatmap/heatmap-color';
import type { HeatmapCell, HeatmapChartConfig } from '../types';

describe('valueColorFor', () => {
  const luminance = (r: number, g: number, b: number): number => {
    const channel = (v: number): number => {
      const c = v / 255;

      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const DARK = luminance(0, 0, 0);
  const LIGHT = luminance(255, 255, 255);

  it('picks the text color with the better contrast against mid-tone fills', () => {
    // The ramp's mid ember: light text measured 2.37:1, dark text 7.21:1.
    const mid = luminance(246, 134, 91);

    // Both syntaxes: the ramp's own toCssColor output is space-separated.
    expect(valueColorFor('rgb(246, 134, 91)', 'fallback')).toBe('#000');
    expect(valueColorFor('rgb(246 134 91)', 'fallback')).toBe('#000');
    expect(contrast(mid, DARK)).toBeGreaterThan(contrast(mid, LIGHT));
  });

  it('keeps light text on dark fills and dark text on light fills', () => {
    expect(valueColorFor('#670c00', 'fallback')).toBe('#fff');
    expect(valueColorFor('#fff1eb', 'fallback')).toBe('#000');
  });

  it('falls back when the fill cannot be measured', () => {
    expect(valueColorFor('var(--p-line)', 'fallback')).toBe('fallback');
  });
});

const ROWS = ['Aria', 'Brom'];
const COLUMNS = ['Forest', 'Swamp', 'Cave'];

const CELLS: HeatmapCell[] = [
  { column: 'Forest', row: 'Aria', value: 90 },
  { column: 'Swamp', row: 'Aria', value: 40 },
  { column: 'Cave', row: 'Aria', value: 65 },
  { column: 'Forest', row: 'Brom', value: 20 },
  { column: 'Swamp', row: 'Brom', value: 75 },
  { column: 'Cave', row: 'Brom', value: 55 },
];

describe('createHeatmapChart', () => {
  let container: HTMLElement;

  const create = (config: Partial<HeatmapChartConfig> = {}) =>
    createHeatmapChart(container, { cells: CELLS, columns: COLUMNS, rows: ROWS, ...config });

  const pointerAt = (chart: ReturnType<typeof create>, clientX: number, clientY: number) => {
    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 400, left: 0, top: 0, width: 400 }),
    });
    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }));
  };

  const keyDown = (chart: ReturnType<typeof create>, key: string) => {
    chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
  };

  /** Center of the cell at (rowIndex, colIndex) in a 400x400 chart. */
  const cellPoint = (chart: ReturnType<typeof create>, row: number, col: number): [number, number] => {
    const first = chart.el.querySelectorAll('.prism-heatmap-cell-rect')[0]!;
    const x0 = Number(first.getAttribute('x'));
    const y0 = Number(first.getAttribute('y'));
    const w = Number(first.getAttribute('width'));
    const h = Number(first.getAttribute('height'));

    return [x0 + w / 2 + col * (w + 2), y0 + h / 2 + row * (h + 2)];
  };

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 400, left: 0, top: 0, width: 400, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('mounts an SVG into the container', () => {
      const chart = create();

      expect(chart.el).toBeInstanceOf(SVGSVGElement);
      expect(container.querySelector('svg')).toBe(chart.el);
      chart.dispose();
    });

    it('draws one cell per row/column pair', () => {
      const chart = create();

      expect(chart.el.querySelectorAll('.prism-heatmap-cell-rect')).toHaveLength(6);
      chart.dispose();
    });

    it('labels every row and column', () => {
      const chart = create();
      const rowLabels = [...chart.el.querySelectorAll('.prism-heatmap-row-label')].map((el) => el.textContent);
      const columnLabels = [...chart.el.querySelectorAll('.prism-heatmap-column-label')].map((el) => el.textContent);

      expect(rowLabels).toEqual(ROWS);
      expect(columnLabels).toEqual(COLUMNS);
      chart.dispose();
    });

    it('shows each value inside its cell', () => {
      const chart = create();
      const values = [...chart.el.querySelectorAll('.prism-heatmap-value')].map((el) => el.textContent);

      expect(values).toEqual(['90', '40', '65', '20', '75', '55']);
      chart.dispose();
    });

    it('renders a row summary column with header and per-row values', () => {
      const chart = create({ rowSummary: { header: 'Win %', values: ['80%', null] } });
      const header = chart.el.querySelector('.prism-heatmap-summary-header');
      const summaries = [...chart.el.querySelectorAll('.prism-heatmap-summary')].map((el) => el.textContent);

      expect(header?.textContent).toBe('Win %');
      expect(summaries).toEqual(['80%', '\u2014']);
      chart.dispose();
    });

    it('shrinks the grid when a row summary is present and restores it on update', () => {
      const withSummary = create({ rowSummary: { values: ['80%', '60%'] } });
      const widthWith = Number(withSummary.el.querySelector('.prism-heatmap-cell-rect')!.getAttribute('width'));

      withSummary.update({ cells: CELLS, rowSummary: undefined });
      const widthWithout = Number(withSummary.el.querySelector('.prism-heatmap-cell-rect')!.getAttribute('width'));

      expect(widthWith).toBeLessThan(widthWithout);
      expect(withSummary.el.querySelectorAll('.prism-heatmap-summary').length).toBe(0);
      withSummary.dispose();
    });

    it('formats in-cell values with valueFormat', () => {
      const chart = create({ valueFormat: (value) => `${value}%` });
      const values = [...chart.el.querySelectorAll('.prism-heatmap-value')].map((el) => el.textContent);

      expect(values[0]).toBe('90%');
      chart.dispose();
    });

    it('hides in-cell values when showValues is false', () => {
      const chart = create({ showValues: false });

      expect(chart.el.querySelectorAll('.prism-heatmap-value')).toHaveLength(0);
      chart.dispose();
    });

    it('paints cells along a continuous ramp from light to dark', () => {
      const chart = create();
      const fills = [...chart.el.querySelectorAll<SVGRectElement>('.prism-heatmap-cell-rect')].map(
        (el) => el.style.fill,
      );

      // First cell (value 90, near the top of the domain) is darker than the last (55).
      expect(fills[0]).not.toBe(fills[5]);
      expect(fills[0]).toMatch(/^rgb\(/);
      chart.dispose();
    });

    it('chooses dark in-cell text on light ramp fills', () => {
      const chart = create();
      // The lightest cell (value 20, bottom of the domain) must carry dark text.
      const texts = [...chart.el.querySelectorAll('.prism-heatmap-cell')].filter(
        (cell) => cell.querySelector('.prism-heatmap-value')?.textContent === '20',
      );

      expect(texts).toHaveLength(1);
      expect(texts[0]!.querySelector('.prism-heatmap-value')!.style.fill).toBe('rgb(0, 0, 0)');
      chart.dispose();
    });

    it('renders missing cells with the empty color and no value text', () => {
      const chart = create({
        cells: [
          { column: 'Forest', row: 'Aria', value: 10 },
          { column: 'Swamp', row: 'Aria', value: null },
          { column: 'Forest', row: 'Brom', value: 90 },
        ],
        emptyColor: '#eeeeee',
      });
      const rects = [...chart.el.querySelectorAll<SVGRectElement>('.prism-heatmap-cell-rect')];

      expect(rects[1].style.fill).toBe('rgb(238, 238, 238)');
      expect(chart.el.querySelectorAll('.prism-heatmap-value')).toHaveLength(2);
      chart.dispose();
    });

    it('clears the grid when rows or columns are empty', () => {
      const chart = create();

      chart.update({ cells: [], columns: [], rows: [] });

      expect(chart.el.querySelectorAll('.prism-heatmap-cell-rect')).toHaveLength(0);
      expect(chart.el.querySelectorAll('.prism-heatmap-row-label')).toHaveLength(0);
      chart.dispose();
    });

    it('re-renders cells on update', () => {
      const chart = create();

      chart.update({
        cells: [{ column: 'Forest', row: 'Aria', value: 50 }],
        columns: ['Forest'],
        rows: ['Aria'],
      });

      expect(chart.el.querySelectorAll('.prism-heatmap-cell-rect')).toHaveLength(1);
      expect(chart.el.querySelector('.prism-heatmap-value')?.textContent).toBe('50');
      chart.dispose();
    });

    it('disposes cleanly', () => {
      const chart = create();

      chart.dispose();
      expect(chart.disposed).toBe(true);
      expect(container.querySelector('svg')).toBeNull();
      expect(() => chart.dispose()).not.toThrow();
    });
  });

  describe('bins', () => {
    it('shows a swatch legend with default labels when bins are set', () => {
      const chart = create({ bins: [30, 60, 90] });
      const labels = [...container.querySelectorAll('.prism-legend-label')].map((el) => el.textContent);

      expect(labels).toEqual(['<30', '30–60', '60–90', '≥90']);
      chart.dispose();
    });

    it('adds the missing swatch when emptyLabel is set', () => {
      const chart = create({ bins: [50], emptyLabel: 'No data' });
      const labels = [...container.querySelectorAll('.prism-legend-label')].map((el) => el.textContent);

      expect(labels).toEqual(['<50', '≥50', 'No data']);
      chart.dispose();
    });

    it('labels bins with binLabel', () => {
      const chart = create({ binLabel: (from, to) => `${from ?? 'min'}..${to ?? 'max'}`, bins: [50] });
      const labels = [...container.querySelectorAll('.prism-legend-label')].map((el) => el.textContent);

      expect(labels).toEqual(['min..50', '50..max']);
      chart.dispose();
    });

    it('maps values to discrete bin colors', () => {
      const chart = create({ bins: [50] });
      const fills = [...chart.el.querySelectorAll<SVGRectElement>('.prism-heatmap-cell-rect')].map(
        (el) => el.style.fill,
      );

      // Aria/Forest (90) and Brom/Swamp (75) share the top bin; Aria/Swamp (40) and Brom/Forest (20) share the low bin.
      expect(fills[0]).toBe(fills[4]);
      expect(fills[1]).toBe(fills[3]);
      expect(fills[0]).not.toBe(fills[1]);
      chart.dispose();
    });

    it('hides the legend when legend is false', () => {
      const chart = create({ bins: [50], legend: false });

      expect(container.querySelector('.prism-legend')).toBeNull();
      chart.dispose();
    });

    it('shows no legend without bins', () => {
      const chart = create();

      expect(container.querySelector('.prism-legend')).toBeNull();
      chart.dispose();
    });
  });

  describe('interaction', () => {
    it('activates the cell under the pointer and shows the tooltip', () => {
      const chart = create({ tooltip: true });
      const [x, y] = cellPoint(chart, 0, 0);

      pointerAt(chart, x, y);

      const tooltip = container.querySelector('.prism-tooltip');

      expect(tooltip).not.toBeNull();
      expect(tooltip?.textContent).toContain('Aria');
      expect(tooltip?.textContent).toContain('Forest');
      chart.dispose();
    });

    it('fires onCellHover with the cell and null when the pointer leaves', () => {
      const onCellHover = vi.fn();
      const chart = create({ onCellHover });
      const [x, y] = cellPoint(chart, 1, 2);

      pointerAt(chart, x, y);
      expect(onCellHover).toHaveBeenCalledWith(expect.objectContaining({ column: 'Cave', row: 'Brom' }));

      chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      expect(onCellHover).toHaveBeenLastCalledWith(null);
      chart.dispose();
    });

    it('fires onCellClick with the clicked cell', () => {
      const onCellClick = vi.fn();
      const chart = create({ onCellClick });
      const [x, y] = cellPoint(chart, 0, 1);

      Object.defineProperty(chart.el, 'getBoundingClientRect', {
        value: () => ({ height: 400, left: 0, top: 0, width: 400 }),
      });
      chart.el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));

      expect(onCellClick).toHaveBeenCalledWith(expect.objectContaining({ column: 'Swamp', row: 'Aria' }));
      chart.dispose();
    });

    it('ignores clicks outside the grid', () => {
      const onCellClick = vi.fn();
      const chart = create({ onCellClick });

      Object.defineProperty(chart.el, 'getBoundingClientRect', {
        value: () => ({ height: 400, left: 0, top: 0, width: 400 }),
      });
      chart.el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 2, clientY: 2 }));

      expect(onCellClick).not.toHaveBeenCalled();
      chart.dispose();
    });

    it('announces the active cell in the live region without a tooltip', () => {
      const chart = create();
      const [x, y] = cellPoint(chart, 0, 0);

      pointerAt(chart, x, y);

      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('Aria · Forest: 90');
      chart.dispose();
    });

    it('clears the live region when the pointer leaves', () => {
      const chart = create();
      const [x, y] = cellPoint(chart, 0, 0);

      pointerAt(chart, x, y);
      chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('');
      chart.dispose();
    });

    it('moves the active cell with arrow keys and announces it', () => {
      const chart = create();

      keyDown(chart, 'ArrowDown');
      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('Aria · Forest: 90');

      keyDown(chart, 'ArrowRight');
      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('Aria · Swamp: 40');

      keyDown(chart, 'ArrowDown');
      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('Brom · Swamp: 75');

      keyDown(chart, 'ArrowUp');
      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('Aria · Swamp: 40');
      chart.dispose();
    });

    it('stops at the grid edges', () => {
      const chart = create();

      keyDown(chart, 'ArrowLeft');
      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('Aria · Forest: 90');

      keyDown(chart, 'ArrowUp');
      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('Aria · Forest: 90');
      chart.dispose();
    });

    it('fires onCellClick for the active cell on Enter', () => {
      const onCellClick = vi.fn();
      const chart = create({ onCellClick });

      keyDown(chart, 'ArrowDown');
      keyDown(chart, 'Enter');

      expect(onCellClick).toHaveBeenCalledWith(expect.objectContaining({ column: 'Forest', row: 'Aria' }));
      chart.dispose();
    });

    it('deactivates on Escape', () => {
      const chart = create();
      const [x, y] = cellPoint(chart, 0, 0);

      pointerAt(chart, x, y);
      keyDown(chart, 'Escape');

      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('');
      expect(chart.el.querySelector('.prism-heatmap-highlight')?.getAttribute('visibility')).toBe('hidden');
      chart.dispose();
    });
  });

  describe('accessibility', () => {
    it('has no axe violations', async () => {
      const chart = create({ bins: [30, 60], emptyLabel: 'No data', tooltip: true });
      const results = await axeCheck(container);

      expect(results.violations).toHaveLength(0);
      chart.dispose();
    });
  });
});
