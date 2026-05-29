import { createVirtualizer } from './scroll';

function makeContainer(
  clientHeight = 200,
  initialScrollTop = 0,
  clientWidth = 300,
  initialScrollLeft = 0,
): HTMLElement {
  let scrollTop = initialScrollTop;
  let scrollLeft = initialScrollLeft;
  const el = document.createElement('div');

  Object.defineProperties(el, {
    clientHeight: { configurable: true, get: () => clientHeight },
    clientWidth: { configurable: true, get: () => clientWidth },
    scrollLeft: {
      configurable: true,
      get: () => scrollLeft,
      set: (v: number) => {
        scrollLeft = v;
      },
    },
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

    if (typeof options?.left === 'number') scrollLeft = options.left;
  }) as typeof el.scrollTo;

  return el;
}

function makeWindow(innerHeight = 300, innerWidth = 400): Window {
  const listeners = new Map<string, Set<(e: Event) => void>>();
  let scrollX = 0;
  let scrollY = 0;

  const win = {
    addEventListener(type: string, cb: (e: Event) => void) {
      let bucket = listeners.get(type);

      if (!bucket) {
        bucket = new Set();
        listeners.set(type, bucket);
      }

      bucket.add(cb);
    },
    dispatchEvent(event: Event) {
      listeners.get(event.type)?.forEach((cb) => cb(event));

      return true;
    },
    innerHeight,
    innerWidth,
    removeEventListener(type: string, cb: (e: Event) => void) {
      listeners.get(type)?.delete(cb);
    },
    scrollTo(options?: ScrollToOptions) {
      if (typeof options?.top === 'number') scrollY = options.top;

      if (typeof options?.left === 'number') scrollX = options.left;
    },
  } as unknown as Window;

  Object.defineProperties(win, {
    scrollX: { configurable: true, get: () => scrollX },
    scrollY: { configurable: true, get: () => scrollY },
  });

  return win;
}

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('createVirtualizer', () => {
  describe('input normalization and defaults', () => {
    test('normalizes invalid count and options to safe defaults', () => {
      const el = makeContainer(200);
      const virt = createVirtualizer(el, {
        count: -5,
        estimateSize: Number.NaN,
        overscan: { end: -3, start: -3 },
        scrollEndDelay: -10,
      });

      expect(virt.count).toBe(0);
      expect(virt.totalSize).toBe(0);
      expect(virt.items).toEqual([]);
      virt.destroy();
    });

    test('falls back to default estimate size when estimate is invalid', () => {
      const el = makeContainer(200);
      const virt = createVirtualizer(el, { count: 3, estimateSize: Number.NaN });

      expect(virt.totalSize).toBe(108);
      virt.destroy();
    });
  });

  describe('targets and rendering', () => {
    test('supports asymmetric overscan with gap', () => {
      const el = makeContainer(100);
      const virt = createVirtualizer(el, {
        count: 10,
        estimateSize: 20,
        gap: 10,
        overscan: { end: 1, start: 0 },
      });

      expect(virt.totalSize).toBe(290);
      expect(virt.items[0]?.index).toBe(0);
      virt.destroy();
    });

    test('supports horizontal virtualization', () => {
      const el = makeContainer(200, 0, 120, 0);
      const virt = createVirtualizer(el, {
        count: 20,
        estimateSize: 30,
        horizontal: true,
        overscan: { end: 0, start: 0 },
      });

      el.scrollLeft = 90;
      el.dispatchEvent(new Event('scroll'));

      expect(virt.scrollOffset).toBe(90);
      expect(virt.items.some((item) => item.start > 0)).toBe(true);
      virt.destroy();
    });

    test('supports window as scroll target', () => {
      const win = makeWindow(100, 200);
      const virt = createVirtualizer(win, { count: 50, estimateSize: 20 });

      win.scrollTo({ top: 200 });
      win.dispatchEvent(new Event('scroll'));

      expect(virt.scrollOffset).toBe(200);
      expect(virt.items.length).toBeGreaterThan(0);
      virt.destroy();
    });

    test('applies initialOffset during creation', () => {
      const el = makeContainer(100, 0);
      const virt = createVirtualizer(el, { count: 100, estimateSize: 20, initialOffset: 180 });

      expect(el.scrollTop).toBe(180);
      expect(virt.scrollOffset).toBe(180);
      virt.destroy();
    });

    test('emits an empty item window when viewport size is zero', () => {
      const el = makeContainer(0, 0);
      const onChange = vi.fn();
      const virt = createVirtualizer(el, {
        count: 5,
        estimateSize: 20,
        onChange,
      });

      expect(onChange).toHaveBeenCalledWith([], 100);
      expect(virt.items).toEqual([]);
      virt.destroy();
    });
  });

  describe('measurement and updates', () => {
    test('refresh keeps measured size stable across reorder when keys are stable', async () => {
      const el = makeContainer(200, 0);
      const ids = ['a', 'b', 'c'];
      const virt = createVirtualizer(el, {
        count: ids.length,
        estimateSize: 20,
        getItemKey: (index) => ids[index]!,
      });

      virt.measure(1, 100);
      await flushMicrotasks();
      expect(virt.totalSize).toBe(140);

      ids.splice(0, ids.length, 'b', 'a', 'c');
      virt.refresh();

      expect(virt.items.find((item) => item.index === 0)?.size).toBe(100);
      virt.destroy();
    });

    test('ignores measure calls with invalid index or invalid size', async () => {
      const el = makeContainer(200, 0);
      const virt = createVirtualizer(el, { count: 3, estimateSize: 20 });

      const initialTotal = virt.totalSize;

      virt.measure(-1, 30);
      virt.measure(Number.NaN, 30);
      virt.measure(99, 30);
      virt.measure(0, 0);
      virt.measure(0, Number.NaN);
      await flushMicrotasks();

      expect(virt.totalSize).toBe(initialTotal);
      virt.destroy();
    });

    test('applies count, estimate, gap, and overscan in one update', () => {
      const el = makeContainer(200, 0);
      const virt = createVirtualizer(el, { count: 10, estimateSize: 20 });

      virt.update({ count: 20, estimateSize: 30, gap: 2, overscan: { end: 4, start: 1 } });

      expect(virt.count).toBe(20);
      expect(virt.totalSize).toBe(638);
      virt.destroy();
    });
  });

  describe('scrolling behavior', () => {
    test('scroll state callbacks fire around scroll end', async () => {
      const el = makeContainer(100, 0);
      const onScrollEnd = vi.fn();
      const onScrollingChange = vi.fn();
      const virt = createVirtualizer(el, {
        count: 100,
        estimateSize: 20,
        onScrollEnd,
        onScrollingChange,
        scrollEndDelay: 5,
      });

      el.scrollTop = 120;
      el.dispatchEvent(new Event('scroll'));

      expect(virt.isScrolling).toBe(true);
      await wait(10);

      expect(virt.isScrolling).toBe(false);
      expect(onScrollingChange).toHaveBeenCalledWith(true);
      expect(onScrollingChange).toHaveBeenCalledWith(false);
      expect(onScrollEnd).toHaveBeenCalledWith(120);
      virt.destroy();
    });

    test('scrollToIndex with auto align does not scroll when item is already visible', () => {
      const el = makeContainer(100, 0);
      const virt = createVirtualizer(el, { count: 20, estimateSize: 20 });

      virt.scrollToIndex(1, { align: 'auto' });

      expect(el.scrollTop).toBe(0);
      virt.destroy();
    });

    test('clamps scroll targets for index and raw offset', () => {
      const el = makeContainer(100, 0);
      const virt = createVirtualizer(el, { count: 5, estimateSize: 20 });

      virt.scrollToIndex(999, { align: 'start' });
      expect(el.scrollTop).toBe(0);

      virt.update({ count: 10 });
      virt.scrollToIndex(-1, { align: 'start' });
      expect(el.scrollTop).toBe(0);

      virt.scrollToOffset(-50);
      expect(el.scrollTop).toBe(0);
      virt.destroy();
    });
  });

  describe('lifecycle', () => {
    test('destroy is idempotent and Symbol.dispose delegates to destroy', () => {
      const el = makeContainer(200, 0);
      const virt = createVirtualizer(el, { count: 5, estimateSize: 20 });
      const spy = vi.spyOn(virt, 'destroy');

      virt.destroy();
      virt.destroy();
      virt[Symbol.dispose]();

      expect(spy).toHaveBeenCalled();
    });

    test('destroy clears pending scroll-end callback', async () => {
      const el = makeContainer(100, 0);
      const onScrollEnd = vi.fn();
      const virt = createVirtualizer(el, {
        count: 10,
        estimateSize: 20,
        onScrollEnd,
        scrollEndDelay: 5,
      });

      el.scrollTop = 80;
      el.dispatchEvent(new Event('scroll'));
      virt.destroy();
      await wait(10);

      expect(onScrollEnd).not.toHaveBeenCalled();
    });
  });
});
