import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAreaChart } from '../charts/area';

describe('createAreaChart', () => {
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

  it('creates an SVG element', () => {
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
          ],
          name: 'Test',
        },
      ],
    });

    expect(chart.el).toBeInstanceOf(SVGSVGElement);
    chart.dispose();
  });

  it('disposes cleanly', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ x: 1, y: 10 }], name: 'Test' }],
    });

    chart.dispose();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders area fill element', () => {
    const chart = createAreaChart(container, {
      series: [
        {
          data: [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
            { x: 3, y: 15 },
          ],
          name: 'Test',
        },
      ],
    });

    expect(chart.el.querySelector('.prism-area-fill')).not.toBeNull();
    chart.dispose();
  });

  it('renders a legend when legend is true', () => {
    const chart = createAreaChart(container, {
      legend: true,
      series: [
        { data: [{ x: 1, y: 10 }], name: 'Alpha' },
        { data: [{ x: 1, y: 20 }], name: 'Beta' },
      ],
    });

    const legend = container.querySelector('.prism-legend');

    expect(legend).not.toBeNull();
    expect(legend!.querySelectorAll('.prism-legend-item').length).toBe(2);
    expect(legend!.querySelectorAll('.prism-legend-label')[0].textContent).toBe('Alpha');
    expect(legend!.querySelectorAll('.prism-legend-label')[1].textContent).toBe('Beta');
    chart.dispose();
  });

  it('renders legend in specified position', () => {
    const chart = createAreaChart(container, {
      legend: { position: 'top' },
      series: [{ data: [{ x: 1, y: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend--top')).not.toBeNull();
    chart.dispose();
  });

  it('removes legend element on dispose', () => {
    const chart = createAreaChart(container, {
      legend: true,
      series: [{ data: [{ x: 1, y: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).not.toBeNull();
    chart.dispose();
    expect(container.querySelector('.prism-legend')).toBeNull();
  });

  it('does not render legend when legend is omitted', () => {
    const chart = createAreaChart(container, {
      series: [{ data: [{ x: 1, y: 5 }], name: 'Series' }],
    });

    expect(container.querySelector('.prism-legend')).toBeNull();
    chart.dispose();
  });
});
