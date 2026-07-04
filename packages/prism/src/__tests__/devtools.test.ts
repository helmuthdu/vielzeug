import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLineChart } from '../charts/line';
import { debugChart } from '../devtools';

describe('debugChart', () => {
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
    vi.restoreAllMocks();
  });

  it('returns the same handle unchanged', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const chart = createLineChart(container, { series: [{ data: [{ key: 1, value: 5 }], name: 'S' }] });
    const wrapped = debugChart(chart);

    expect(wrapped).toBe(chart);
    chart.dispose();
    debugSpy.mockRestore();
  });

  it('logs "mounted" with the default label', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const chart = createLineChart(container, { series: [{ data: [{ key: 1, value: 5 }], name: 'S' }] });

    debugChart(chart);

    expect(debugSpy).toHaveBeenCalledWith('[prism:chart] mounted');
    chart.dispose();
  });

  it('uses a custom label in the log prefix', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const chart = createLineChart(container, { series: [{ data: [{ key: 1, value: 5 }], name: 'S' }] });

    debugChart(chart, { label: 'revenue' });

    expect(debugSpy).toHaveBeenCalledWith('[prism:revenue] mounted');
    chart.dispose();
  });

  it('logs "disposed" when the underlying chart is disposed', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const chart = createLineChart(container, { series: [{ data: [{ key: 1, value: 5 }], name: 'S' }] });

    debugChart(chart);
    chart.dispose();

    expect(debugSpy).toHaveBeenCalledWith('[prism:chart] disposed');
  });

  it('does not throw when disposed twice', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const chart = createLineChart(container, { series: [{ data: [{ key: 1, value: 5 }], name: 'S' }] });

    debugChart(chart);
    chart.dispose();

    expect(() => chart.dispose()).not.toThrow();
    debugSpy.mockRestore();
  });
});
