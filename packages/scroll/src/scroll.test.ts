import { flushMicrotasks, makeContainer, makeWindow, wait } from './__tests__/test-utils';
import { createVirtualizer } from './scroll';

describe('createVirtualizer', () => {
  describe('input normalization and defaults', () => {
    test('normalizes invalid count and options to safe defaults', () => {
      const el = makeContainer({ clientHeight: 200 });
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
      const el = makeContainer({ clientHeight: 200 });
      const virt = createVirtualizer(el, { count: 3, estimateSize: Number.NaN });

      expect(virt.totalSize).toBe(108);
      virt.destroy();
    });
  });

  describe('targets and rendering', () => {
    test('supports asymmetric overscan with gap', () => {
      const el = makeContainer({ clientHeight: 100 });
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
      const el = makeContainer({ clientHeight: 200, clientWidth: 120 });
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
      const el = makeContainer({ clientHeight: 100 });
      const virt = createVirtualizer(el, { count: 100, estimateSize: 20, initialOffset: 180 });

      expect(el.scrollTop).toBe(180);
      expect(virt.scrollOffset).toBe(180);
      virt.destroy();
    });

    test('emits an empty item window when viewport size is zero', () => {
      const el = makeContainer({ clientHeight: 0 });
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
      const el = makeContainer({ clientHeight: 200 });
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
      const el = makeContainer({ clientHeight: 200 });
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
      const el = makeContainer({ clientHeight: 200 });
      const virt = createVirtualizer(el, { count: 10, estimateSize: 20 });

      virt.update({ count: 20, estimateSize: 30, gap: 2, overscan: { end: 4, start: 1 } });

      expect(virt.count).toBe(20);
      expect(virt.totalSize).toBe(638);
      virt.destroy();
    });

    test('update({ getItemKey: undefined }) removes the key function and clears measurements', async () => {
      const el = makeContainer({ clientHeight: 200 });
      const ids = ['a', 'b', 'c'];
      const virt = createVirtualizer(el, {
        count: ids.length,
        estimateSize: 20,
        getItemKey: (index) => ids[index]!,
      });

      virt.measure(0, 80);
      await flushMicrotasks();
      expect(virt.totalSize).toBe(120); // 80 + 20 + 20

      // Remove the key function — measurements must be cleared since keys no longer apply
      virt.update({ getItemKey: undefined });

      expect(virt.totalSize).toBe(60); // back to 3 × 20 default
      virt.destroy();
    });

    test('update({ getItemKey: undefined }) twice does not cause spurious rebuilds', async () => {
      const el = makeContainer({ clientHeight: 200 });
      const onChange = vi.fn();
      const virt = createVirtualizer(el, {
        count: 3,
        estimateSize: 20,
        getItemKey: (index) => String(index),
        onChange,
      });

      virt.measure(0, 50);
      await flushMicrotasks();

      onChange.mockClear();
      virt.update({ getItemKey: undefined }); // first removal — clears measurements, triggers rebuild
      expect(onChange).toHaveBeenCalledTimes(1);

      onChange.mockClear();
      virt.update({ getItemKey: undefined }); // second call — stable defaultItemKey, no rebuild
      expect(onChange).not.toHaveBeenCalled();
      virt.destroy();
    });

    test('onMeasure fires when a size changes, not on duplicate measure', async () => {
      const el = makeContainer({ clientHeight: 200 });
      const onMeasure = vi.fn();
      const virt = createVirtualizer(el, { count: 3, estimateSize: 20, onMeasure });

      virt.measure(1, 60);
      await flushMicrotasks();

      expect(onMeasure).toHaveBeenCalledTimes(1);
      expect(onMeasure).toHaveBeenCalledWith(1, undefined, 60);

      onMeasure.mockClear();
      virt.measure(1, 60); // same size — no-op
      await flushMicrotasks();

      expect(onMeasure).not.toHaveBeenCalled();

      virt.measure(1, 80); // changed
      await flushMicrotasks();

      expect(onMeasure).toHaveBeenCalledWith(1, 60, 80);
      virt.destroy();
    });

    test('measureBatch applies all valid entries in a single microtask', async () => {
      const el = makeContainer({ clientHeight: 200 });
      const onChange = vi.fn();
      const virt = createVirtualizer(el, { count: 5, estimateSize: 20, onChange });

      onChange.mockClear();
      virt.measureBatch([
        { index: 0, size: 50 },
        { index: 1, size: 80 },
        { index: 2, size: 30 },
      ]);

      expect(onChange).not.toHaveBeenCalled(); // no sync call yet
      await flushMicrotasks();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(virt.totalSize).toBe(50 + 80 + 30 + 20 + 20);
      virt.destroy();
    });

    test('measureBatch ignores invalid entries and skips rebuild when nothing changed', async () => {
      const el = makeContainer({ clientHeight: 200 });
      const virt = createVirtualizer(el, { count: 3, estimateSize: 20 });
      const initial = virt.totalSize;

      virt.measureBatch([
        { index: -1, size: 30 },
        { index: Number.NaN, size: 30 },
        { index: 99, size: 30 },
        { index: 0, size: 0 },
      ]);
      await flushMicrotasks();

      expect(virt.totalSize).toBe(initial);
      virt.destroy();
    });

    test('measureBatch with empty array is a no-op', async () => {
      const el = makeContainer({ clientHeight: 200 });
      const onChange = vi.fn();
      const virt = createVirtualizer(el, { count: 3, estimateSize: 20, onChange });

      onChange.mockClear();
      virt.measureBatch([]);
      await flushMicrotasks();

      expect(onChange).not.toHaveBeenCalled();
      virt.destroy();
    });

    test('measureBatch with duplicate indices uses the last valid size', async () => {
      const el = makeContainer({ clientHeight: 200 });
      const virt = createVirtualizer(el, { count: 3, estimateSize: 20 });

      virt.measureBatch([
        { index: 0, size: 40 },
        { index: 0, size: 70 }, // overrides 40
      ]);
      await flushMicrotasks();

      expect(virt.items.find((i) => i.index === 0)?.size).toBe(70);
      virt.destroy();
    });
  });

  describe('scrolling behavior', () => {
    test('scroll state callbacks fire around scroll end', async () => {
      const el = makeContainer({ clientHeight: 100 });
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
      const el = makeContainer({ clientHeight: 100 });
      const virt = createVirtualizer(el, { count: 20, estimateSize: 20 });

      virt.scrollToIndex(1, { align: 'auto' });

      expect(el.scrollTop).toBe(0);
      virt.destroy();
    });

    test('clamps scroll targets for index and raw offset', () => {
      const el = makeContainer({ clientHeight: 100 });
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
      const el = makeContainer({ clientHeight: 200 });
      const virt = createVirtualizer(el, { count: 5, estimateSize: 20 });
      const spy = vi.spyOn(virt, 'destroy');

      virt.destroy();
      virt.destroy();
      virt[Symbol.dispose]();

      expect(spy).toHaveBeenCalled();
    });

    test('destroy clears pending scroll-end callback', async () => {
      const el = makeContainer({ clientHeight: 100 });
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
