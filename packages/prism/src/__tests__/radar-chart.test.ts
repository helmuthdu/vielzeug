import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRadarChart } from '../charts/radar';
import type { RadarChartConfig, RadarSeriesConfig } from '../types';

const AXES = [
  { key: 'str', label: 'Strength' },
  { key: 'agi', label: 'Agility' },
  { key: 'int', label: 'Intellect' },
  { key: 'luck', label: 'Luck' },
];

const ANA: RadarSeriesConfig = {
  data: [
    { key: 'str', value: 8 },
    { key: 'agi', value: 6 },
    { key: 'int', value: 4 },
    { key: 'luck', value: 7 },
  ],
  name: 'Ana',
};

const BROM: RadarSeriesConfig = {
  data: [
    { key: 'str', value: 5 },
    { key: 'agi', value: 9 },
    { key: 'int', value: 7 },
    { key: 'luck', value: 3 },
  ],
  name: 'Brom',
};

describe('createRadarChart', () => {
  let container: HTMLElement;

  const create = (config: Partial<RadarChartConfig> = {}) =>
    createRadarChart(container, { axes: AXES, series: [ANA], transition: { duration: 0 }, ...config });

  const pointerAt = (chart: ReturnType<typeof create>, clientX: number, clientY: number) => {
    Object.defineProperty(chart.el, 'getBoundingClientRect', {
      value: () => ({ height: 400, left: 0, top: 0, width: 400 }),
    });
    chart.el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }));
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

    it('draws one closed shape per series', () => {
      const chart = create({ series: [ANA, BROM] });
      const areas = chart.el.querySelectorAll('.prism-radar-area');

      expect(areas).toHaveLength(2);
      expect(areas[0].getAttribute('d')).toMatch(/^M.*Z$/);
      chart.dispose();
    });

    it('labels every axis', () => {
      const chart = create();
      const labels = [...chart.el.querySelectorAll('.prism-radar-axis-label')].map((el) => el.textContent);

      expect(labels).toEqual(['Strength', 'Agility', 'Intellect', 'Luck']);
      chart.dispose();
    });

    it('draws rings, alternating bands, and one spoke per axis by default', () => {
      const chart = create();

      expect(chart.el.querySelectorAll('.prism-radar-ring')).toHaveLength(4);
      expect(chart.el.querySelectorAll('.prism-radar-band')).toHaveLength(2);
      expect(chart.el.querySelectorAll('.prism-radar-spoke')).toHaveLength(4);
      chart.dispose();
    });

    it('omits the grid when grid is false', () => {
      const chart = create({ grid: false });

      expect(chart.el.querySelector('.prism-radar-grid')?.childElementCount).toBe(0);
      chart.dispose();
    });

    it('draws circular rings for the circle grid shape', () => {
      const chart = create({ grid: { bands: false, levels: 3, shape: 'circle' } });
      const rings = chart.el.querySelectorAll('.prism-radar-ring');

      expect(rings).toHaveLength(3);
      expect(rings[0].getAttribute('d')).toContain('A');
      expect(chart.el.querySelector('.prism-radar-band')).toBeNull();
      chart.dispose();
    });

    it('shows level values only when every axis shares a domain', () => {
      const shared = create({ domain: [0, 8], grid: { labels: true, levels: 4 } });

      expect([...shared.el.querySelectorAll('.prism-radar-level')].map((el) => el.textContent)).toEqual([
        '2',
        '4',
        '6',
        '8',
      ]);
      shared.dispose();

      const mixed = create({
        axes: [{ ...AXES[0], max: 20 }, ...AXES.slice(1)],
        domain: [0, 10],
        grid: { labels: true },
      });

      expect(mixed.el.querySelector('.prism-radar-level')).toBeNull();
      mixed.dispose();
    });

    it('scales each value against its own axis domain', () => {
      const chart = create({
        axes: [{ ...AXES[0], max: 16 }, ...AXES.slice(1)],
        domain: [0, 8],
        startAngle: 0,
      });
      const [str, agi] = [...chart.el.querySelectorAll<SVGCircleElement>('.prism-radar-point')];
      const cx = 200;
      const cy = 200;

      // Strength 8 of 16 sits halfway out; Agility 6 of 8 sits three quarters out.
      const strDistance = cy - Number(str.getAttribute('cy'));
      const agiDistance = Number(agi.getAttribute('cx')) - cx;

      expect(agiDistance / strDistance).toBeCloseTo(1.5);
      chart.dispose();
    });

    it('marks a missing value with a hollow point at the centre', () => {
      const chart = create({ series: [{ data: ANA.data.slice(0, 3), name: 'Ana' }] });
      const missing = chart.el.querySelector('.prism-radar-point--missing');

      expect(missing?.getAttribute('fill')).toBe('none');
      expect(missing?.getAttribute('cx')).toBe('200');
      chart.dispose();
    });

    it('hides points when showPoints is false', () => {
      const chart = create({ showPoints: false });

      expect(chart.el.querySelector('.prism-radar-point')).toBeNull();
      chart.dispose();
    });

    it('prints formatted values at each vertex when showValues is set', () => {
      const chart = create({ axes: [{ ...AXES[0], format: (v) => `${v} STR` }, ...AXES.slice(1)], showValues: true });
      const values = [...chart.el.querySelectorAll('.prism-radar-value')].map((el) => el.textContent);

      expect(values).toEqual(['8 STR', '6', '4', '7']);
      chart.dispose();
    });

    it('fills with a per-series radial gradient whose ids are unique across charts', () => {
      const first = create({ fill: 'gradient' });
      const second = create({ fill: 'gradient' });
      const ids = [first, second].map((c) => c.el.querySelector('radialGradient')?.id);

      expect(first.el.querySelector('.prism-radar-area')?.getAttribute('fill')).toBe(`url(#${ids[0]})`);
      expect(ids[0]).not.toBe(ids[1]);
      first.dispose();
      second.dispose();
    });

    it('draws a rounded outline with curve segments', () => {
      const chart = create({ curve: 'rounded' });

      expect(chart.el.querySelector('.prism-radar-area')?.getAttribute('d')).toContain('C');
      chart.dispose();
    });

    it('uses the series colour override', () => {
      const chart = create({ series: [{ ...ANA, color: '#c90' }] });

      expect(chart.el.querySelector('.prism-radar-area')?.getAttribute('stroke')).toBe('#c90');
      chart.dispose();
    });

    it('lists every series in the legend', () => {
      const chart = create({ legend: true, series: [ANA, BROM] });

      expect([...container.querySelectorAll('.prism-legend-label')].map((el) => el.textContent)).toEqual([
        'Ana',
        'Brom',
      ]);
      chart.dispose();
    });
  });

  describe('updates and lifecycle', () => {
    it('redraws for new series data', () => {
      const chart = create();
      const before = chart.el.querySelector('.prism-radar-area')?.getAttribute('d');

      chart.update([BROM, ANA]);

      expect(chart.el.querySelectorAll('.prism-radar-area')).toHaveLength(2);
      expect(chart.el.querySelector('.prism-radar-area')?.getAttribute('d')).not.toBe(before);
      chart.dispose();
    });

    it('morphs from the previous shape when a transition is enabled', () => {
      const frames: FrameRequestCallback[] = [];

      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));

      const chart = create({ transition: { duration: 100 } });

      // Let the mount fade-and-rise settle so the update morphs from drawn geometry.
      for (let i = 0; i < 5 && frames.length > 0; i++) frames.shift()?.(i * 100);

      // The series groups rebuild on update, so the point is re-queried each time.
      const cy = () => chart.el.querySelector('.prism-radar-point')?.getAttribute('cy');
      const settled = cy();

      chart.update([BROM]);

      frames.shift()?.(0);
      // The morph starts on the geometry that is already on screen.
      expect(cy()).toBe(settled);
      frames.shift()?.(100);
      expect(cy()).not.toBe(settled);
      chart.dispose();
    });

    it('renders an empty chart for no series without throwing', () => {
      const chart = create({ series: [] });

      expect(chart.el.querySelector('.prism-radar-area')).toBeNull();
      chart.dispose();
    });

    it('removes the SVG on dispose and ignores a second dispose', () => {
      const chart = create();

      chart.dispose();
      expect(container.querySelector('svg')).toBeNull();
      expect(chart.disposed).toBe(true);
      expect(() => chart.dispose()).not.toThrow();
    });

    it('supports Symbol.dispose', () => {
      const chart = create();

      chart[Symbol.dispose]();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('throws when updating a disposed chart', () => {
      const chart = create();

      chart.dispose();
      expect(() => chart.update([ANA])).toThrow();
    });
  });

  describe('configuration warnings', () => {
    it('warns and draws nothing with fewer than 3 axes', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const chart = create({ axes: AXES.slice(0, 2) });

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('at least 3 axes'));
      expect(chart.el.querySelector('.prism-radar-area')).toBeNull();
      chart.dispose();
    });

    it('warns about values for unknown axes', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const chart = create({ series: [{ data: [{ key: 'charm', value: 3 }], name: 'Ana' }] });

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('unknown axis "charm"'));
      chart.dispose();
    });
  });

  describe('interaction', () => {
    it('reports the nearest axis and every series value on hover', () => {
      const onHover = vi.fn();
      const chart = create({ onHover, series: [ANA, BROM] });

      pointerAt(chart, 300, 200);

      const event = onHover.mock.calls[0][0];

      expect(event.axis.key).toBe('agi');
      expect(event.values.map((v: { datum?: { value: number } }) => v.datum?.value)).toEqual([6, 9]);
      expect(chart.el.querySelector('.prism-radar-spoke--active')?.getAttribute('data-axis')).toBe('1');
      chart.dispose();
    });

    it('clears the hover state on mouseleave', () => {
      const onHover = vi.fn();
      const chart = create({ onHover });

      pointerAt(chart, 300, 200);
      chart.el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      expect(onHover).toHaveBeenLastCalledWith(null);
      expect(chart.el.querySelector('.prism-radar-spoke--active')).toBeNull();
      chart.dispose();
    });

    it('ignores pointers far outside the chart', () => {
      const onHover = vi.fn();
      const chart = create({ onHover });

      pointerAt(chart, 400, 0);
      expect(onHover).not.toHaveBeenCalled();
      chart.dispose();
    });

    it('reports the clicked axis', () => {
      const onClick = vi.fn();
      const chart = create({ onClick });

      Object.defineProperty(chart.el, 'getBoundingClientRect', {
        value: () => ({ height: 400, left: 0, top: 0, width: 400 }),
      });
      chart.el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 120 }));

      expect(onClick.mock.calls[0][0].axis.key).toBe('str');
      chart.dispose();
    });

    it('shows a tooltip comparing every series on the hovered axis', () => {
      const chart = create({ series: [ANA, BROM], tooltip: true });

      pointerAt(chart, 300, 200);

      const rows = [...container.querySelectorAll('.prism-tooltip-row')].map((row) => row.textContent);

      expect(container.querySelector('.prism-tooltip-title')?.textContent).toBe('Agility');
      expect(rows).toEqual(['Ana6', 'Brom9']);
      expect(container.querySelector('.prism-tooltip-sr')?.textContent).toBe('Agility: Ana 6, Brom 9');
      chart.dispose();
    });

    it('passes the axis values to a custom tooltip render', () => {
      const render = vi.fn(() => 'custom');
      const chart = create({ tooltip: { render } });

      pointerAt(chart, 300, 200);
      expect(render).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'agi', meta: expect.objectContaining({ axis: AXES[1] }) }),
        expect.objectContaining({ name: 'Agility' }),
      );
      chart.dispose();
    });
  });

  describe('keyboard and screen readers', () => {
    const key = (chart: ReturnType<typeof create>, name: string) =>
      chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: name }));

    it('steps through axes with the arrow keys and announces the values', () => {
      const chart = create({ series: [ANA, BROM] });
      const live = chart.el.querySelector('.prism-live');

      key(chart, 'ArrowRight');
      expect(live?.textContent).toBe('Strength: Ana 8, Brom 5');
      key(chart, 'ArrowRight');
      expect(live?.textContent).toBe('Agility: Ana 6, Brom 9');
      key(chart, 'ArrowLeft');
      key(chart, 'ArrowLeft');
      expect(live?.textContent).toBe('Luck: Ana 7, Brom 3');
      chart.dispose();
    });

    it('announces a missing value as n/a', () => {
      const chart = create({ series: [{ data: [], name: 'Ana' }] });

      key(chart, 'ArrowRight');
      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('Strength: Ana n/a');
      chart.dispose();
    });

    it('activates the focused axis with Enter and clears it with Escape', () => {
      const onClick = vi.fn();
      const chart = create({ onClick });

      key(chart, 'ArrowRight');
      key(chart, 'Enter');
      expect(onClick.mock.calls[0][0].axis.key).toBe('str');

      key(chart, 'Escape');
      expect(chart.el.querySelector('.prism-live')?.textContent).toBe('');
      chart.dispose();
    });

    it('exposes the live region as a polite status', () => {
      const chart = create();
      const live = chart.el.querySelector('.prism-live');

      expect(live?.getAttribute('role')).toBe('status');
      expect(live?.getAttribute('aria-live')).toBe('polite');
      chart.dispose();
    });

    it('hides the grid and labels from assistive tech', () => {
      const chart = create({ a11y: { ariaLabel: 'Hero stats' } });

      expect(chart.el.getAttribute('role')).toBe('img');
      expect(chart.el.getAttribute('aria-label')).toBe('Hero stats');
      expect(chart.el.querySelector('.prism-radar-grid')?.getAttribute('aria-hidden')).toBe('true');
      expect(chart.el.querySelector('.prism-radar-labels')?.getAttribute('aria-hidden')).toBe('true');
      chart.dispose();
    });

    it('is decorative when a11y is omitted', () => {
      const chart = create();

      expect(chart.el.getAttribute('aria-hidden')).toBe('true');
      chart.dispose();
    });

    it('passes the axe accessibility audit', async () => {
      const chart = create({
        a11y: { ariaLabel: 'Hero stats' },
        fill: 'gradient',
        grid: { labels: true },
        legend: true,
        series: [ANA, BROM],
        showValues: true,
        tooltip: true,
      });
      const results = await axeCheck(container);

      expect(results.violations).toHaveLength(0);
      chart.dispose();
    });
  });
});
