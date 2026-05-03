import { createVirtualizer } from './virtualit';

function makeContainer(clientHeight = 200, initialScrollTop = 0): HTMLElement {
  let scrollTop = initialScrollTop;
  const el = document.createElement('div');

  Object.defineProperties(el, {
    clientHeight: { configurable: true, get: () => clientHeight },
    scrollTop: {
      configurable: true,
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    },
  });

  el.scrollTo = ((options?: ScrollToOptions) => {
    if (typeof options?.top === 'number') scrollTop = options.top;
  }) as typeof el.scrollTo;

  return el;
}

const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r));

describe('createVirtualizer', () => {
  test('normalizes invalid count and estimate values', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, {
      count: -10,
      estimateSize: Number.NaN,
      overscan: -3,
    });

    expect(virt.count).toBe(0);
    expect(virt.totalSize).toBe(0);
    expect(virt.items).toHaveLength(0);
    virt.destroy();
  });

  test('sanitizes invalid per-index estimate results', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, {
      count: 3,
      estimateSize: (i) => (i === 1 ? Number.NaN : 20),
    });

    expect(virt.totalSize).toBe(20 + 36 + 20);
    virt.destroy();
  });

  test('fixed-height list: returns correct range at scrollTop 0', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 36 });

    expect(virt.items[0]?.index).toBe(0);
    expect(virt.items.at(-1)?.index).toBeGreaterThanOrEqual(7);
    virt.destroy();
  });

  test('totalSize equals count × estimateSize for an unmeasured list', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 50, estimateSize: 40 });

    expect(virt.totalSize).toBe(50 * 40);
    virt.destroy();
  });

  test('updates visible window after scroll event', () => {
    const el = makeContainer(100);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 50 });

    el.scrollTop = 500;
    el.dispatchEvent(new Event('scroll'));

    expect(virt.items.some((it) => it.index === 10)).toBe(true);
    expect(virt.items.every((it) => it.index >= 7)).toBe(true);
    virt.destroy();
  });

  test('onChange does not fire when scroll stays within same item boundary', () => {
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 20, estimateSize: 500, onChange, overscan: 0 });

    onChange.mockClear();

    el.scrollTop = 100;
    el.dispatchEvent(new Event('scroll'));
    expect(onChange).not.toHaveBeenCalled();

    el.scrollTop = 600;
    el.dispatchEvent(new Event('scroll'));
    expect(onChange).toHaveBeenCalledOnce();

    virt.destroy();
  });

  test('update count rebuilds totalSize', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 10, estimateSize: 36 });

    virt.update({ count: 50 });
    expect(virt.totalSize).toBe(50 * 36);
    virt.destroy();
  });

  test('update count also updates count getter', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 10 });

    virt.update({ count: 25 });
    expect(virt.count).toBe(25);
    virt.destroy();
  });

  test('updating estimateSize rebuilds totalSize and clears measured sizes', async () => {
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 10, estimateSize: 36, onChange });

    virt.measure(0, 100);
    await flushMicrotasks();
    expect(virt.totalSize).toBe(100 + 9 * 36);

    onChange.mockClear();
    virt.update({ estimateSize: 48 });

    expect(virt.totalSize).toBe(10 * 48);
    expect(onChange).toHaveBeenCalledOnce();
    virt.destroy();
  });

  test('supports estimator function via update', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 4, estimateSize: 36 });

    virt.update({ estimateSize: (i) => (i === 0 ? 100 : 50) });
    expect(virt.totalSize).toBe(100 + 3 * 50);
    virt.destroy();
  });

  test('ignores out-of-range index and invalid heights', async () => {
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 3, estimateSize: 20, onChange });

    onChange.mockClear();
    virt.measure(999, 50);
    virt.measure(1, -10);
    virt.measure(1, Number.NaN);
    await flushMicrotasks();

    expect(virt.totalSize).toBe(60);
    expect(onChange).not.toHaveBeenCalled();
    virt.destroy();
  });

  test('measured height affects totalSize after microtask flush', async () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 5, estimateSize: 36 });

    virt.measure(0, 100);
    await flushMicrotasks();

    expect(virt.totalSize).toBe(100 + 4 * 36);
    virt.destroy();
  });

  test('invalidate clears measured heights and resets to estimated sizes', async () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 5, estimateSize: 36 });

    virt.measure(0, 100);
    await flushMicrotasks();
    expect(virt.totalSize).toBe(100 + 4 * 36);

    virt.invalidate();
    expect(virt.totalSize).toBe(5 * 36);
    virt.destroy();
  });

  test('scrollToIndex align variants', () => {
    const el = makeContainer(200, 0);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 36 });

    virt.scrollToIndex(10, { align: 'start' });
    expect(el.scrollTop).toBe(360);

    virt.scrollToIndex(10, { align: 'end' });
    expect(el.scrollTop).toBe(196);

    virt.scrollToIndex(10, { align: 'center' });
    expect(el.scrollTop).toBe(278);

    virt.destroy();
  });

  test('scrollToOffset clamps values', () => {
    const el = makeContainer(100, 0);
    const virt = createVirtualizer(el, { count: 5, estimateSize: 20 });

    virt.scrollToOffset(999);
    expect(el.scrollTop).toBe(0);

    virt.scrollToOffset(-100);
    expect(el.scrollTop).toBe(0);

    virt.destroy();
  });

  test('destroy is idempotent and symbol dispose calls destroy', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 5 });
    const spy = vi.spyOn(virt, 'destroy');

    expect(() => virt.destroy()).not.toThrow();
    expect(() => virt.destroy()).not.toThrow();

    virt[Symbol.dispose]();
    expect(spy).toHaveBeenCalled();
  });

  test('update can atomically change multiple options', () => {
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 10, estimateSize: 20, onChange, overscan: 0 });

    onChange.mockClear();
    virt.update({ count: 20, estimateSize: 40, overscan: 2 });

    expect(virt.count).toBe(20);
    expect(virt.totalSize).toBe(800);
    expect(virt.items.length).toBeGreaterThan(0);
    expect(onChange).toHaveBeenCalledOnce();
    virt.destroy();
  });
});
