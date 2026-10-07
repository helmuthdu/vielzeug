import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLineChart } from '../charts/line';
import { createSparkline } from '../charts/sparkline';
import type { PrismEvent } from '../types';

// A controllable ResizeObserver: the default stub never fires, so tests capture the
// callback and invoke it to drive a real resize pass through the chart's own observer.
let resizeCallback: ((entries: { contentRect: DOMRectReadOnly }[]) => void) | undefined;

function fireResize(width: number, height: number): void {
  resizeCallback?.([{ contentRect: { height, width } as DOMRectReadOnly }]);
}

describe('ChartHandle.tap', () => {
  let container: HTMLElement;
  let OriginalRO: typeof ResizeObserver;

  beforeEach(() => {
    OriginalRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: (entries: { contentRect: DOMRectReadOnly }[]) => void) {
        resizeCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    container = document.createElement('div');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => ({ height: 300, width: 600, x: 0, y: 0 }),
    });
    document.body.appendChild(container);
  });

  afterEach(() => {
    globalThis.ResizeObserver = OriginalRO;
    resizeCallback = undefined;
    container.remove();
  });

  it('emits a resize event when the container observer fires', async () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 1 }], name: 'S' }],
    });
    const events: PrismEvent[] = [];
    chart.tap((event) => events.push(event));

    fireResize(800, 400);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(events).toEqual([{ height: 400, type: 'resize', width: 800 }]);
    await axeCheck(container);
    chart.dispose();
  });

  it('emits a dispose event once, before teardown', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 1 }], name: 'S' }],
    });
    const events: PrismEvent[] = [];
    chart.tap((event) => events.push(event));

    chart.dispose();
    chart.dispose();

    expect(events).toEqual([{ type: 'dispose' }]);
  });

  it('stops delivering after the unsubscribe function runs', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 1 }], name: 'S' }],
    });
    const events: PrismEvent[] = [];
    const unsubscribe = chart.tap((event) => events.push(event));

    unsubscribe();
    chart.dispose();

    expect(events).toEqual([]);
  });

  it('detaches automatically when the abort signal fires', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 1 }], name: 'S' }],
    });
    const controller = new AbortController();
    const events: PrismEvent[] = [];
    chart.tap((event) => events.push(event), { signal: controller.signal });

    controller.abort();
    chart.dispose();

    expect(events).toEqual([]);
  });

  it('swallows handler errors so observation cannot break the chart', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 1 }], name: 'S' }],
    });
    chart.tap(() => {
      throw new Error('handler blew up');
    });

    expect(() => chart.dispose()).not.toThrow();
  });

  it('returns a no-op unsubscribe when tapping a disposed chart', () => {
    const chart = createLineChart(container, {
      series: [{ data: [{ key: 1, value: 1 }], name: 'S' }],
    });
    chart.dispose();

    const handler = vi.fn();
    const unsubscribe = chart.tap(handler);

    expect(() => unsubscribe()).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it('sparkline emits dispose through tap', () => {
    const chart = createSparkline(container, { data: [1, 2, 3] });
    const events: PrismEvent[] = [];
    chart.tap((event) => events.push(event));

    chart.dispose();

    expect(events).toEqual([{ type: 'dispose' }]);
  });
});
