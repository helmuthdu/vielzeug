import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAreaChart } from '../charts/area';
import { createBarChart } from '../charts/bar';
import { createLineChart } from '../charts/line';
import { createRadarChart } from '../charts/radar';

const AXES = [
  { key: 'str', label: 'STR' },
  { key: 'agi', label: 'AGI' },
  { key: 'int', label: 'INT' },
];

function mount(): HTMLElement {
  const container = document.createElement('div');

  Object.defineProperty(container, 'getBoundingClientRect', {
    value: () => ({ height: 300, width: 600, x: 0, y: 0 }),
  });
  document.body.appendChild(container);

  return container;
}

describe('per-datum presentation (dash / opacity)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = mount();
  });

  afterEach(() => {
    container.remove();
  });

  describe('bar chart', () => {
    const MIXED = [
      {
        data: [
          { key: 'Jan', value: 10 },
          { key: 'Feb', opacity: 0.4, value: 12 },
        ],
        name: 'Cost',
      },
    ];

    it('fades only the styled datum rect', () => {
      const chart = createBarChart(container, { series: MIXED });
      const bars = chart.el.querySelectorAll<SVGRectElement>('.prism-bar');

      expect(bars[0]?.getAttribute('opacity')).toBeNull();
      expect(bars[1]?.getAttribute('opacity')).toBe('0.4');
      chart.dispose();
    });

    it('gives a dashed datum a visible series-color stroke', () => {
      const chart = createBarChart(container, {
        series: [{ data: [{ dash: '5 5', key: 'Jan', value: 10 }], name: 'Cost' }],
      });
      const bar = chart.el.querySelector<SVGRectElement>('.prism-bar')!;

      expect(bar.getAttribute('stroke-dasharray')).toBe('5 5');
      expect(bar.getAttribute('stroke')).toBe('var(--prism-color-1)');
      expect(bar.getAttribute('stroke-width')).toBe('1');
      chart.dispose();
    });

    it('keeps opacity as a presentation attribute so CSS interaction states still apply', () => {
      const chart = createBarChart(container, { series: MIXED });
      const bar = chart.el.querySelectorAll<SVGRectElement>('.prism-bar')[1]!;

      expect(bar.style.opacity).toBe('');
      chart.el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      expect(chart.el.querySelector('.prism-series')?.classList.contains('prism-bars-focused')).toBe(true);
      chart.dispose();
    });

    it('removes presentation attributes when an update drops the fields', () => {
      const chart = createBarChart(container, {
        series: [{ data: [{ dash: '5 5', key: 'Jan', opacity: 0.4, value: 10 }], name: 'Cost' }],
      });

      chart.update([{ data: [{ key: 'Jan', value: 10 }], name: 'Cost' }]);

      const bar = chart.el.querySelector<SVGRectElement>('.prism-bar')!;

      expect(bar.hasAttribute('opacity')).toBe(false);
      expect(bar.hasAttribute('stroke-dasharray')).toBe(false);
      expect(bar.hasAttribute('stroke')).toBe(false);
      chart.dispose();
    });

    it('emits no presentation attributes for unstyled series', () => {
      const chart = createBarChart(container, {
        series: [{ data: [{ key: 'Jan', value: 10 }], name: 'Cost' }],
      });
      const bar = chart.el.querySelector<SVGRectElement>('.prism-bar')!;

      expect(bar.hasAttribute('opacity')).toBe(false);
      expect(bar.hasAttribute('stroke-dasharray')).toBe(false);
      expect(bar.hasAttribute('stroke')).toBe(false);
      expect(bar.hasAttribute('stroke-width')).toBe(false);
      chart.dispose();
    });
  });

  describe('line chart', () => {
    const TAIL = [
      {
        data: [
          { key: 1, value: 10 },
          { dash: '5 5', key: 2, opacity: 0.4, value: 20 },
          { key: 3, value: 15 },
        ],
        name: 'Test',
      },
    ];

    it('splits the line at the dash-run boundary and styles only the tail segment', () => {
      const chart = createLineChart(container, { series: TAIL, transition: false });
      const paths = chart.el.querySelectorAll<SVGPathElement>('.prism-line-path');

      expect(paths).toHaveLength(2);
      expect(paths[0]?.hasAttribute('stroke-dasharray')).toBe(false);
      expect(paths[0]?.hasAttribute('opacity')).toBe(false);
      expect(paths[1]?.getAttribute('stroke-dasharray')).toBe('5 5');
      expect(paths[1]?.getAttribute('opacity')).toBe('0.4');
      expect(paths[1]?.getAttribute('d')).toBe('M265,0L530,58');
      chart.dispose();
    });

    it('merges consecutive datums that share one style into a single run', () => {
      const chart = createLineChart(container, {
        series: [
          {
            data: [
              { key: 1, value: 10 },
              { dash: '5 5', key: 2, value: 20 },
              { dash: '5 5', key: 3, value: 15 },
              { key: 4, value: 12 },
            ],
            name: 'Test',
          },
        ],
      });

      const paths = chart.el.querySelectorAll<SVGPathElement>('.prism-line-path');

      expect(paths).toHaveLength(2);
      expect(paths[1]?.getAttribute('stroke-dasharray')).toBe('5 5');
      chart.dispose();
    });

    it('ignores the last datum dash because it has no segment to paint', () => {
      const chart = createLineChart(container, {
        series: [
          {
            data: [
              { key: 1, value: 10 },
              { dash: '5 5', key: 2, value: 20 },
            ],
            name: 'Test',
          },
        ],
      });
      const paths = chart.el.querySelectorAll<SVGPathElement>('.prism-line-path');

      expect(paths).toHaveLength(1);
      expect(paths[0]?.hasAttribute('stroke-dasharray')).toBe(false);
      chart.dispose();
    });

    it('fades the point marker of the datum that carries opacity', () => {
      const chart = createLineChart(container, {
        series: [
          {
            data: [
              { key: 1, value: 10 },
              { key: 2, opacity: 0.4, value: 20 },
              { key: 3, value: 15 },
            ],
            name: 'Test',
          },
        ],
        tooltip: false,
      });

      chart.update([
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, opacity: 0.4, value: 20 },
            { key: 3, value: 15 },
          ],
          name: 'Test',
          showPoints: true,
        },
      ]);

      const dots = chart.el.querySelectorAll<SVGCircleElement>('.prism-line-dot');

      expect(dots[1]?.getAttribute('opacity')).toBe('0.4');
      expect(dots[2]?.hasAttribute('opacity')).toBe(false);
      chart.dispose();
    });

    it('re-applies fields on update and clears them when they are removed', () => {
      const chart = createLineChart(container, { series: TAIL });

      chart.update([
        {
          data: [
            { key: 1, value: 10 },
            { key: 2, value: 20 },
            { key: 3, value: 15 },
          ],
          name: 'Test',
        },
      ]);

      const paths = chart.el.querySelectorAll<SVGPathElement>('.prism-line-path');

      expect(paths).toHaveLength(1);
      expect(paths[0]?.hasAttribute('stroke-dasharray')).toBe(false);
      expect(paths[0]?.hasAttribute('opacity')).toBe(false);
      chart.dispose();
    });

    it('renders a no-presentation config byte-identically to the pre-feature output', () => {
      const chart = createLineChart(container, {
        series: [
          {
            data: [
              { key: 1, value: 10 },
              { key: 2, value: 20 },
              { key: 3, value: 15 },
            ],
            name: 'Test',
          },
        ],
        transition: false,
      });

      expect(chart.el.querySelector('.prism-line-series')?.innerHTML).toBe(
        '<path class="prism-line-path" fill="none" stroke="var(--prism-color-1)" stroke-width="2" d="M0,116L265,0L530,58"></path>',
      );
      chart.dispose();
    });
  });

  describe('area chart', () => {
    const AREA = {
      data: [
        { key: 1, value: 10 },
        { dash: '5 5', key: 2, opacity: 0.4, value: 20 },
        { key: 3, value: 15 },
      ],
      name: 'Test',
    };

    it('splits the top line while the fill stays one path', () => {
      const chart = createAreaChart(container, { series: [AREA] });

      expect(chart.el.querySelectorAll('.prism-area-line')).toHaveLength(2);
      expect(chart.el.querySelectorAll('.prism-area-fill')).toHaveLength(1);
      expect(chart.el.querySelector('.prism-area-fill')?.hasAttribute('stroke-dasharray')).toBe(false);
      chart.dispose();
    });

    it('clears the split when an update drops the fields', () => {
      const chart = createAreaChart(container, { series: [AREA] });

      chart.update([{ data: AREA.data.map(({ dash: _d, opacity: _o, ...rest }) => rest), name: 'Test' }]);

      const lines = chart.el.querySelectorAll<SVGPathElement>('.prism-area-line');

      expect(lines).toHaveLength(1);
      expect(lines[0]?.hasAttribute('stroke-dasharray')).toBe(false);
      chart.dispose();
    });
  });

  describe('radar chart', () => {
    it('ignores datum presentation fields', () => {
      const chart = createRadarChart(container, {
        axes: AXES,
        series: [{ data: [{ dash: '5 5', key: 'str', opacity: 0.4, value: 5 }], name: 'Ana' }],
      });
      const area = chart.el.querySelector<SVGPathElement>('.prism-radar-area')!;

      expect(area.hasAttribute('stroke-dasharray')).toBe(false);
      expect(area.hasAttribute('opacity')).toBe(false);
      chart.dispose();
    });
  });
});

describe('data-series-id', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = mount();
  });

  afterEach(() => {
    container.remove();
  });

  it('falls back to the series index', () => {
    const chart = createLineChart(container, {
      series: [
        { data: [{ key: 1, value: 1 }], name: 'A' },
        { data: [{ key: 1, value: 2 }], name: 'B' },
      ],
    });
    const groups = chart.el.querySelectorAll('.prism-line-series');

    expect(groups[0]?.getAttribute('data-series-id')).toBe('series-0');
    expect(groups[1]?.getAttribute('data-series-id')).toBe('series-1');
    chart.dispose();
  });

  it('uses an explicit id and sanitizes attribute-unsafe characters', () => {
    const chart = createBarChart(container, {
      series: [{ data: [{ key: 'A', value: 1 }], id: 'cloud "<b>cost', name: 'Cost' }],
    });

    expect(chart.el.querySelector('.prism-bar-series')?.getAttribute('data-series-id')).toBe('cloud---b-cost');
    chart.dispose();
  });

  it('re-applies the id when an update reorders series', () => {
    const chart = createBarChart(container, {
      series: [
        { data: [{ key: 'A', value: 1 }], id: 'first', name: 'A' },
        { data: [{ key: 'A', value: 2 }], id: 'second', name: 'B' },
      ],
    });

    chart.update([
      { data: [{ key: 'A', value: 2 }], id: 'second', name: 'B' },
      { data: [{ key: 'A', value: 1 }], id: 'first', name: 'A' },
    ]);

    const groups = chart.el.querySelectorAll('.prism-bar-series');

    expect(groups[0]?.getAttribute('data-series-id')).toBe('second');
    expect(groups[1]?.getAttribute('data-series-id')).toBe('first');
    chart.dispose();
  });

  it('is present on area and radar series groups', () => {
    const area = createAreaChart(container, { series: [{ data: [{ key: 1, value: 1 }], name: 'A' }] });

    expect(area.el.querySelector('.prism-area-series')?.getAttribute('data-series-id')).toBe('series-0');
    area.dispose();

    const radar = createRadarChart(container, {
      axes: AXES,
      series: [{ data: AXES.map(({ key }) => ({ key, value: 3 })), id: 'hero', name: 'Ana' }],
    });

    expect(radar.el.querySelector('.prism-radar-series')?.getAttribute('data-series-id')).toBe('hero');
    radar.dispose();
  });
});
