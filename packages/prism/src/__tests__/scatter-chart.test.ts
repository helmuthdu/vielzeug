import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createScatterChart } from '../charts/scatter';
import type { ChartEvent, ChartHandle, PrismEvent, ScatterSeriesConfig } from '../types';

/** Collects rAF callbacks so a test can advance a tween to an exact timestamp. */
function driveFrames(): FrameRequestCallback[] {
  const frames: FrameRequestCallback[] = [];

  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    frames.push(cb);

    return frames.length;
  });

  return frames;
}

const NO_MARGIN = { bottom: 0, left: 0, right: 0, top: 0 };

const ALPHA: ScatterSeriesConfig = {
  data: [
    { key: 1, value: 10 },
    { key: 3, value: 30 },
    { key: 5, value: 20 },
  ],
  name: 'Alpha',
};
const BETA: ScatterSeriesConfig = {
  data: [
    { key: 2, value: 25 },
    { key: 4, value: 15 },
  ],
  name: 'Beta',
};

const points = (chart: ChartHandle<unknown>) => [
  ...chart.el.querySelectorAll<SVGCircleElement>('.prism-scatter-point'),
];
const attr = (el: Element | undefined, name: string) => Number(el?.getAttribute(name));
const press = (chart: ChartHandle<unknown>, key: string) =>
  chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
const live = (chart: ChartHandle<unknown>) => chart.el.querySelector('.prism-live')?.textContent;

function hover(chart: ChartHandle<unknown>, clientX: number, clientY: number, type = 'mousemove'): void {
  Object.defineProperty(chart.el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ height: 300, left: 0, top: 0, width: 600 }),
  });
  chart.el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX, clientY }));
}

describe('createScatterChart', () => {
  let container: HTMLElement;

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
    vi.unstubAllGlobals();
  });

  describe('rendering', () => {
    it('mounts an SVG and renders one point per datum in a group per series', () => {
      const chart = createScatterChart(container, {
        series: [ALPHA, { ...BETA, id: 'beta' }],
        transition: false,
      });
      const groups = chart.el.querySelectorAll('.prism-scatter-series');

      expect(container.querySelector('svg')).toBe(chart.el);
      expect(points(chart)).toHaveLength(5);
      expect(groups).toHaveLength(2);
      expect(groups[0].getAttribute('data-series-id')).toBe('series-0');
      expect(groups[1].getAttribute('data-series-id')).toBe('beta');
      expect(chart.el.querySelector('.prism-line-path')).toBeNull();
      chart.dispose();
    });

    it('positions each point independently from its key (x) and value (y)', () => {
      const chart = createScatterChart(container, { margin: NO_MARGIN, series: [ALPHA], transition: false });
      const [first, second, third] = points(chart);

      expect(attr(first, 'cx')).toBe(0);
      expect(attr(third, 'cx')).toBe(600);
      expect(attr(second, 'cx')).toBe(300);
      // y: 10 at the bottom, 30 at the top, 20 in the middle of the fitted domain.
      expect(attr(first, 'cy')).toBe(300);
      expect(attr(second, 'cy')).toBe(0);
      expect(attr(third, 'cy')).toBe(150);
      chart.dispose();
    });

    it('fits the y domain to the data instead of forcing zero', () => {
      const chart = createScatterChart(container, {
        margin: NO_MARGIN,
        series: [
          {
            data: [
              { key: 1, value: 100 },
              { key: 2, value: 110 },
            ],
            name: 'Tight',
          },
        ],
        transition: false,
      });
      const [low, high] = points(chart);

      expect(attr(low, 'cy')).toBe(300);
      expect(attr(high, 'cy')).toBe(0);
      chart.dispose();
    });

    it('accepts Date keys on a time x axis', () => {
      const chart = createScatterChart(container, {
        margin: NO_MARGIN,
        series: [
          {
            data: [
              { key: new Date(2026, 0, 1), value: 1 },
              { key: new Date(2026, 0, 3), value: 2 },
              { key: new Date(2026, 0, 2), value: 3 },
            ],
            name: 'Dated',
          },
        ],
        transition: false,
      });

      expect(points(chart).map((p) => attr(p, 'cx'))).toEqual([0, 600, 300]);
      chart.dispose();
    });

    it('applies the series color, per-series radius, and datum opacity while ignoring dash', () => {
      const chart = createScatterChart(container, {
        series: [
          {
            color: 'rebeccapurple',
            data: [
              { dash: '4 4', key: 1, opacity: 0.4, value: 1 },
              { key: 2, value: 2 },
            ],
            name: 'Styled',
            pointRadius: 7,
          },
          { data: [{ key: 3, value: 3 }], name: 'Default' },
        ],
        transition: false,
      });
      const [faded, plain, themed] = points(chart);

      expect(faded.getAttribute('fill')).toBe('rebeccapurple');
      expect(faded.getAttribute('r')).toBe('7');
      expect(faded.getAttribute('opacity')).toBe('0.4');
      expect(faded.hasAttribute('stroke-dasharray')).toBe(false);
      expect(plain.hasAttribute('opacity')).toBe(false);
      expect(themed.getAttribute('r')).toBe('3');
      expect(themed.getAttribute('fill')).toBe('var(--prism-color-2)');
      chart.dispose();
    });

    it('renders both axes and value-axis gridlines by default, keeping the grid under a partial yAxis', () => {
      const defaults = createScatterChart(container, { series: [ALPHA], transition: false });

      expect(defaults.el.querySelector('.prism-x-axis')?.children.length).toBeGreaterThan(0);
      expect(defaults.el.querySelector('.prism-y-axis')?.children.length).toBeGreaterThan(0);
      expect(defaults.el.querySelector('.prism-grid')?.children.length).toBeGreaterThan(0);
      defaults.dispose();

      const partial = createScatterChart(container, {
        series: [ALPHA],
        transition: false,
        yAxis: { tickFormat: (v) => `${v} kg` },
      });

      expect(partial.el.querySelector('.prism-grid')?.children.length).toBeGreaterThan(0);
      expect(partial.el.querySelector('.prism-y-axis')?.textContent).toContain('kg');
      partial.dispose();
    });

    it('suppresses axes and grid with false', () => {
      const chart = createScatterChart(container, { series: [ALPHA], transition: false, xAxis: false, yAxis: false });

      expect(chart.el.querySelector('.prism-x-axis')?.children).toHaveLength(0);
      expect(chart.el.querySelector('.prism-y-axis')?.children).toHaveLength(0);
      expect(chart.el.querySelector('.prism-grid')?.children).toHaveLength(0);
      chart.dispose();
    });

    it('warns and falls back to a valid domain for non-finite values', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const chart = createScatterChart(container, {
        series: [
          {
            data: [
              { key: 1, value: Number.NaN },
              { key: 2, value: 3 },
            ],
            name: 'Bad',
          },
        ],
        transition: false,
      });

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('NaN or Infinity'));
      expect(points(chart).every((p) => Number.isFinite(attr(p, 'cx')))).toBe(true);
      chart.dispose();
    });
  });

  describe('lifecycle', () => {
    it('replaces series on update, including removing points and series', () => {
      const chart = createScatterChart(container, { series: [ALPHA, BETA], transition: false });

      chart.update([{ ...ALPHA, data: ALPHA.data.slice(0, 1) }]);

      expect(points(chart)).toHaveLength(1);
      expect(chart.el.querySelectorAll('.prism-scatter-series')).toHaveLength(1);
      chart.dispose();
    });

    it('clears every cartesian group when updated to empty data', () => {
      const chart = createScatterChart(container, { legend: true, series: [ALPHA], transition: false });

      chart.update([]);

      expect(points(chart)).toHaveLength(0);
      expect(chart.el.querySelector('.prism-x-axis')?.children).toHaveLength(0);
      expect(chart.el.querySelector('.prism-grid')?.children).toHaveLength(0);
      expect(container.querySelectorAll('.prism-legend-item')).toHaveLength(0);
      chart.dispose();
    });

    it('disposes once, emits dispose to tap handlers, and rejects later updates', () => {
      const chart = createScatterChart(container, { series: [ALPHA], tooltip: true });
      const events: PrismEvent[] = [];

      chart.tap((event) => events.push(event));
      chart.dispose();
      chart.dispose();

      expect(events).toEqual([{ type: 'dispose' }]);
      expect(chart.disposed).toBe(true);
      expect(chart.disposalSignal.aborted).toBe(true);
      expect(container.querySelector('svg, .prism-tooltip')).toBeNull();
      expect(() => chart.update([ALPHA])).toThrow('Cannot update a disposed chart.');
    });

    it('rolls back mounted resources when the initial render throws', () => {
      expect(() =>
        createScatterChart(container, {
          series: [ALPHA],
          xAxis: {
            tickFormat: () => {
              throw new Error('format failed');
            },
          },
        }),
      ).toThrow('Failed to render chart.');

      expect(container.children).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('reports the nearest point in two dimensions on hover, without cross-series values', () => {
      const onHover = vi.fn();
      const chart = createScatterChart(container, {
        margin: NO_MARGIN,
        onHover,
        series: [ALPHA, BETA],
        transition: false,
      });
      // Alpha's key-3 point sits at (300, 0); Beta's key-4 point at (450, 225).
      hover(chart, 280, 20);

      const event: ChartEvent = onHover.mock.calls.at(-1)![0];

      expect(event.series.name).toBe('Alpha');
      expect(event.datum).toEqual({ key: 3, value: 30 });
      expect(event.values).toBeUndefined();

      // (330, 200) is nearest Alpha in x alone, but nearest Beta's key-4 point in 2D.
      hover(chart, 330, 200);
      expect(onHover.mock.calls.at(-1)![0].datum).toEqual({ key: 4, value: 15 });
      chart.dispose();
    });

    it('resolves a hovered marker directly and emphasises its series', () => {
      const chart = createScatterChart(container, { series: [ALPHA, BETA], transition: false });
      const target = chart.el.querySelectorAll('.prism-scatter-series')[1].children[1];

      target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));

      const groups = chart.el.querySelectorAll('.prism-scatter-series');

      expect(live(chart)).toBe('4: Beta 15');
      expect(chart.el.querySelectorAll('.prism-active-point')).toHaveLength(1);
      expect(chart.el.querySelector('.prism-series')?.classList.contains('prism-series-focused')).toBe(true);
      expect(groups[1].classList.contains('prism-series-active')).toBe(true);
      expect(groups[0].classList.contains('prism-series-active')).toBe(false);
      chart.dispose();
    });

    it('clears on mouseleave and when the pointer leaves the plot area', () => {
      const onHover = vi.fn();
      const chart = createScatterChart(container, { onHover, series: [ALPHA], transition: false });

      press(chart, 'Home');
      hover(chart, 0, 0, 'mouseleave');

      expect(onHover).toHaveBeenLastCalledWith(null);
      expect(live(chart)).toBe('');
      expect(chart.el.querySelector('.prism-active-point')).toBeNull();
      chart.dispose();
    });

    it('walks every point across series in x order from the keyboard', () => {
      const chart = createScatterChart(container, { series: [ALPHA, BETA], transition: false });
      const spoken: string[] = [];

      for (let i = 0; i < 5; i++) {
        press(chart, 'ArrowRight');
        spoken.push(live(chart)!);
      }

      expect(spoken).toEqual(['1: Alpha 10', '2: Beta 25', '3: Alpha 30', '4: Beta 15', '5: Alpha 20']);
      press(chart, 'ArrowRight');
      expect(live(chart)).toBe('5: Alpha 20');
      press(chart, 'Home');
      expect(live(chart)).toBe('1: Alpha 10');
      press(chart, 'End');
      expect(live(chart)).toBe('5: Alpha 20');
      press(chart, 'ArrowLeft');
      expect(live(chart)).toBe('4: Beta 15');
      chart.dispose();
    });

    it('activates the focused point with Enter or Space and clears with Escape', () => {
      const onClick = vi.fn();
      const onHover = vi.fn();
      const chart = createScatterChart(container, { onClick, onHover, series: [ALPHA, BETA], transition: false });

      press(chart, 'ArrowRight');
      press(chart, 'ArrowRight');
      press(chart, 'Enter');
      press(chart, ' ');

      expect(onClick).toHaveBeenCalledTimes(2);
      expect(onClick.mock.calls[0][0]).toMatchObject({ datum: { key: 2, value: 25 }, series: { name: 'Beta' } });
      expect(onClick.mock.calls[0][0].values).toBeUndefined();

      press(chart, 'Escape');
      press(chart, 'Enter');

      expect(onClick).toHaveBeenCalledTimes(2);
      expect(onHover).toHaveBeenLastCalledWith(null);
      expect(chart.el.querySelector('.prism-series-focused')).toBeNull();
      chart.dispose();
    });

    it('reports the nearest point on pointer click', () => {
      const onClick = vi.fn();
      const chart = createScatterChart(container, {
        margin: NO_MARGIN,
        onClick,
        series: [ALPHA],
        transition: false,
      });

      hover(chart, 590, 160, 'click');

      expect(onClick.mock.calls[0][0].datum).toEqual({ key: 5, value: 20 });
      chart.dispose();
    });

    it('shows a single-row tooltip with formatted title and value, spoken by the tooltip only', () => {
      const chart = createScatterChart(container, {
        series: [ALPHA],
        tooltip: { titleFormat: (key) => `${key} cm`, valueFormat: (value) => `${value} kg` },
        transition: false,
      });

      press(chart, 'Home');

      expect(container.querySelector('.prism-tooltip-title')?.textContent).toBe('1 cm');
      expect([...container.querySelectorAll('.prism-tooltip-row')].map((row) => row.textContent)).toEqual([
        'Alpha10 kg',
      ]);
      expect(container.querySelector('.prism-tooltip-sr')?.textContent).toBe('1 cm: Alpha 10 kg');
      expect(live(chart)).toBe('');
      chart.dispose();
    });

    it('snaps the crosshair to the active point, or follows the pointer with snap: false', () => {
      const snapped = createScatterChart(container, {
        crosshair: { horizontal: true },
        margin: NO_MARGIN,
        series: [ALPHA],
        transition: false,
      });

      hover(snapped, 290, 10);

      expect(snapped.el.querySelector<SVGLineElement>('.prism-crosshair-v')?.style.transform).toBe('translateX(300px)');
      expect(snapped.el.querySelector<SVGLineElement>('.prism-crosshair-h')?.style.transform).toBe('translateY(0px)');
      snapped.dispose();

      const raw = createScatterChart(container, {
        crosshair: { snap: false },
        margin: NO_MARGIN,
        series: [ALPHA],
        transition: false,
      });

      hover(raw, 290, 10);
      expect(raw.el.querySelector<SVGLineElement>('.prism-crosshair-v')?.style.transform).toBe('translateX(290px)');
      raw.dispose();
    });
  });

  describe('accessibility', () => {
    it('exposes an informative labelled image with a single polite live region', () => {
      const chart = createScatterChart(container, {
        a11y: { ariaLabel: 'Height against weight' },
        crosshair: true,
        series: [ALPHA],
      });

      expect(chart.el.getAttribute('role')).toBe('img');
      expect(chart.el.getAttribute('aria-label')).toBe('Height against weight');
      expect(chart.el.querySelector('.prism-grid')?.getAttribute('aria-hidden')).toBe('true');
      expect(chart.el.querySelector('.prism-active-points')?.getAttribute('aria-hidden')).toBe('true');

      const regions = chart.el.querySelectorAll('[aria-live]');

      expect(regions).toHaveLength(1);
      expect(regions[0].getAttribute('role')).toBe('status');
      expect(regions[0].getAttribute('aria-live')).toBe('polite');
      chart.dispose();
    });

    it('passes the axe audit at rest and while a point is active with every overlay enabled', async () => {
      const chart = createScatterChart(container, {
        a11y: { ariaLabel: 'Height against weight' },
        crosshair: { horizontal: true },
        legend: true,
        series: [ALPHA, BETA],
        tooltip: true,
        xAxis: { label: 'Height' },
        yAxis: { label: 'Weight' },
      });

      expect((await axeCheck(container)).violations).toEqual([]);
      press(chart, 'ArrowRight');
      expect(container.querySelector('.prism-tooltip')?.getAttribute('aria-live')).toBe('polite');
      expect((await axeCheck(container)).violations).toEqual([]);
      chart.dispose();
    });

    it('passes the axe audit when decorative', async () => {
      const chart = createScatterChart(container, { a11y: { decorative: true }, series: [ALPHA] });

      expect((await axeCheck(container)).violations).toEqual([]);
      chart.dispose();
    });
  });

  describe('motion', () => {
    it('grows points from radius 0 at their final positions on mount', () => {
      const frames = driveFrames();
      const chart = createScatterChart(container, { series: [ALPHA], transition: { duration: 100 } });
      const [first] = points(chart);
      const cx = first.getAttribute('cx');

      expect(attr(first, 'r')).toBe(0);
      frames.shift()?.(0);
      frames.shift()?.(50);
      expect(attr(first, 'r')).toBeGreaterThan(0);
      expect(attr(first, 'r')).toBeLessThan(3);
      expect(first.getAttribute('cx')).toBe(cx);
      frames.shift()?.(100);
      expect(attr(first, 'r')).toBe(3);
      expect(frames).toHaveLength(0);
      chart.dispose();
    });

    it('slides existing points from their drawn position on update', () => {
      const frames = driveFrames();
      const chart = createScatterChart(container, { series: [ALPHA], transition: { duration: 100 } });

      frames.shift()?.(0);
      frames.shift()?.(100);

      const [first] = points(chart);
      const from = attr(first, 'cy');

      chart.update([{ ...ALPHA, data: [{ key: 1, value: 30 }, ...ALPHA.data.slice(1)] }]);
      expect(attr(first, 'cy')).toBe(from);
      expect(attr(first, 'r')).toBe(3);
      frames.shift()?.(0);
      frames.shift()?.(50);
      expect(attr(first, 'cy')).toBeLessThan(from);
      expect(attr(first, 'cy')).toBeGreaterThan(0);
      frames.shift()?.(100);
      expect(attr(first, 'cy')).toBeLessThan(from);
      chart.dispose();
    });

    it('caps the entrance stagger so many points do not crawl', () => {
      const frames = driveFrames();
      const data = Array.from({ length: 40 }, (_, i) => ({ key: i, value: i }));
      const chart = createScatterChart(container, {
        series: [{ data, name: 'Many' }],
        transition: { duration: 100, stagger: 100 },
      });
      const last = points(chart)[39];

      // Uncapped, the 40th point would start at 3900 ms; capped to 400 ms total, it
      // finishes by duration + 400 ms.
      frames.shift()?.(0);
      frames.shift()?.(450);
      expect(attr(last, 'r')).toBeGreaterThan(0);
      frames.shift()?.(500);
      expect(attr(last, 'r')).toBe(3);
      chart.dispose();
    });

    it('renders final points synchronously with transition: false or reduced motion', () => {
      const frames = driveFrames();
      const off = createScatterChart(container, { series: [ALPHA], transition: false });

      expect(points(off).every((p) => attr(p, 'r') === 3)).toBe(true);
      off.dispose();

      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      const reduced = createScatterChart(container, { series: [ALPHA] });

      expect(points(reduced).every((p) => attr(p, 'r') === 3)).toBe(true);
      reduced.update([BETA]);
      expect(points(reduced).every((p) => attr(p, 'r') === 3)).toBe(true);
      expect(frames).toHaveLength(0);
      reduced.dispose();
    });

    it('stops scheduling frames once disposed mid-entrance', () => {
      const frames = driveFrames();
      const chart = createScatterChart(container, { series: [ALPHA], transition: { duration: 100 } });

      chart.dispose();
      frames.shift()?.(0);
      expect(frames).toHaveLength(0);
    });

    it('applies a resize immediately without animating', () => {
      const pending = new Map<number, FrameRequestCallback>();
      let nextId = 0;
      let notify: ResizeObserverCallback | undefined;

      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
        pending.set(++nextId, cb);
        return nextId;
      });
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
        pending.delete(id);
      });
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: ResizeObserverCallback) {
            notify = callback;
          }
          observe() {}
          disconnect() {}
          unobserve() {}
        },
      );
      const chart = createScatterChart(container, { margin: NO_MARGIN, series: [ALPHA] });
      const events: PrismEvent[] = [];
      const step = (time: number) => {
        const callbacks = [...pending.values()];
        pending.clear();
        for (const callback of callbacks) callback(time);
      };

      chart.tap((event) => events.push(event));
      step(0);
      notify?.([{ contentRect: { height: 240, width: 500 } } as ResizeObserverEntry], {} as ResizeObserver);
      step(100);

      expect(events).toEqual([{ height: 240, type: 'resize', width: 500 }]);
      expect(chart.el.getAttribute('viewBox')).toBe('0 0 500 240');
      expect(points(chart).map((p) => attr(p, 'cx'))).toEqual([0, 250, 500]);
      expect(points(chart).every((p) => attr(p, 'r') === 3)).toBe(true);
      expect(pending.size).toBe(0);
      chart.dispose();
    });
  });
});
