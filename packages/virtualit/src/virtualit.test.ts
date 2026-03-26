import { createVirtualizer, Virtualizer } from './virtualit';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a fake scroll container with controllable clientHeight / scrollTop. */
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

  // jsdom doesn't implement scrollTo; provide a minimal stub
  el.scrollTo = ((options?: ScrollToOptions) => {
    if (typeof options?.top === 'number') scrollTop = options.top;
  }) as typeof el.scrollTo;

  return el;
}

/** Flush all pending microtasks. */
const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r));

// ─── Core rendering ──────────────────────────────────────────────────────────

describe('getVirtualItems / getTotalSize', () => {
  test('normalizes invalid count and estimate values', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, {
      count: -10,
      estimateSize: Number.NaN,
      overscan: -3,
    });

    expect(virt.count).toBe(0);
    expect(virt.getTotalSize()).toBe(0);
    expect(virt.getVirtualItems()).toHaveLength(0);
    virt.destroy();
  });

  test('sanitizes invalid per-index estimate results', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, {
      count: 3,
      estimateSize: (i) => (i === 1 ? Number.NaN : 20),
    });

    // item 1 falls back to default estimate size 36
    expect(virt.getTotalSize()).toBe(20 + 36 + 20);
    virt.destroy();
  });

  test('fixed-height list: returns correct range at scrollTop 0', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 36 });

    const items = virt.getVirtualItems();

    // viewport 200px / 36px ≈ 5.5 visible + 3 overscan each side
    expect(items[0]?.index).toBe(0);
    expect(items.at(-1)?.index).toBeGreaterThanOrEqual(7);
    virt.destroy();
  });

  test('totalSize equals count × estimateSize for an unmeasured list', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 50, estimateSize: 40 });

    expect(virt.getTotalSize()).toBe(50 * 40);
    virt.destroy();
  });

  test('count === 0 produces empty items and totalSize 0', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 0 });

    expect(virt.getVirtualItems()).toHaveLength(0);
    expect(virt.getTotalSize()).toBe(0);
    virt.destroy();
  });

  test('items have correct top offsets for a uniform-height list', () => {
    const el = makeContainer(100);
    const virt = createVirtualizer(el, { count: 20, estimateSize: 50 });

    const items = virt.getVirtualItems();

    for (const item of items) {
      expect(item.top).toBe(item.index * 50);
    }
    virt.destroy();
  });

  test('per-index estimator is called per item', () => {
    const el = makeContainer(200);
    const estimateSize = (i: number) => (i % 2 === 0 ? 30 : 50);
    const virt = createVirtualizer(el, { count: 10, estimateSize });

    // total = 5×30 + 5×50 = 400
    expect(virt.getTotalSize()).toBe(400);
    virt.destroy();
  });

  test('updates visible window after scroll event', () => {
    const el = makeContainer(100);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 50 });

    // Simulate scrolling past the first 10 items (500px)
    el.scrollTop = 500;
    el.dispatchEvent(new Event('scroll'));

    const items = virt.getVirtualItems();

    expect(items.some((it) => it.index === 10)).toBe(true);
    expect(items.every((it) => it.index >= 7)).toBe(true); // 10 - 3 overscan
    virt.destroy();
  });

  test('onChange does not fire when scroll stays within same item boundary', () => {
    // Use large items (500px) so a scroll within one item never crosses a boundary
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 20, estimateSize: 500, onChange, overscan: 0 });

    onChange.mockClear();

    // Scroll 100px — still fully within item 0, range [0,0] unchanged
    el.scrollTop = 100;
    el.dispatchEvent(new Event('scroll'));
    expect(onChange).not.toHaveBeenCalled();

    // Scroll past item 0 boundary — range [0,0] → [1,1], onChange fires
    el.scrollTop = 600;
    el.dispatchEvent(new Event('scroll'));
    expect(onChange).toHaveBeenCalledOnce();

    virt.destroy();
  });
});

// ─── count setter ─────────────────────────────────────────────────────────────

describe('count setter', () => {
  test('updating count via setter rebuilds totalSize', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 10, estimateSize: 36 });

    virt.count = 50;
    expect(virt.getTotalSize()).toBe(50 * 36);
    virt.destroy();
  });

  test('count getter returns current value', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 10 });

    virt.count = 25;
    expect(virt.count).toBe(25);
    virt.destroy();
  });

  test('onChange fires after count update when attached', () => {
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 10, estimateSize: 36, onChange });

    onChange.mockClear();
    virt.count = 20;
    expect(onChange).toHaveBeenCalledOnce();
    virt.destroy();
  });

  test('onChange does NOT fire when count is updated before attach', () => {
    const onChange = vi.fn();
    const virt = new Virtualizer({ count: 10, estimateSize: 36, onChange });

    // not yet attached
    virt.count = 20;
    expect(onChange).not.toHaveBeenCalled();

    const el = makeContainer(200);

    virt.attach(el);
    expect(onChange).toHaveBeenCalledOnce();
    virt.destroy();
  });
});

// ─── estimateSize setter ──────────────────────────────────────────────────────

describe('estimateSize setter', () => {
  test('changing estimateSize rebuilds totalSize and re-renders', () => {
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 10, estimateSize: 36, onChange });

    onChange.mockClear();
    virt.estimateSize = 48;

    expect(virt.getTotalSize()).toBe(10 * 48);
    expect(onChange).toHaveBeenCalledOnce();
    virt.destroy();
  });

  test('changing estimateSize clears measured heights', async () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 5, estimateSize: 36 });

    virt.measureElement(0, 100);
    await flushMicrotasks();
    expect(virt.getTotalSize()).toBe(100 + 4 * 36);

    // Switch density — measured heights should be discarded
    virt.estimateSize = 48;
    expect(virt.getTotalSize()).toBe(5 * 48);
    virt.destroy();
  });

  test('accepts a function estimator', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 4, estimateSize: 36 });

    virt.estimateSize = (i) => (i === 0 ? 100 : 50);
    expect(virt.getTotalSize()).toBe(100 + 3 * 50);
    virt.destroy();
  });
});

// ─── measureElement ──────────────────────────────────────────────────────────

describe('measureElement', () => {
  test('ignores out-of-range index and invalid heights', async () => {
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 3, estimateSize: 20, onChange });

    onChange.mockClear();
    virt.measureElement(999, 50);
    virt.measureElement(1, -10);
    virt.measureElement(1, Number.NaN);
    await flushMicrotasks();

    expect(virt.getTotalSize()).toBe(60);
    expect(onChange).not.toHaveBeenCalled();
    virt.destroy();
  });

  test('measured height affects totalSize after microtask flush', async () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 5, estimateSize: 36 });

    virt.measureElement(0, 100); // item 0 grows from 36 → 100
    await flushMicrotasks();

    expect(virt.getTotalSize()).toBe(100 + 4 * 36);
    virt.destroy();
  });

  test('no-op when height equals the effective height', async () => {
    const el = makeContainer(200);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 5, estimateSize: 36, onChange });

    onChange.mockClear();
    virt.measureElement(0, 36); // same as estimate — skip
    await flushMicrotasks();

    expect(onChange).not.toHaveBeenCalled();
    virt.destroy();
  });

  test('batches multiple calls into a single rebuild', async () => {
    const el = makeContainer(200);
    const buildSpy = vi.spyOn(Virtualizer.prototype as any, 'buildOffsets');

    const virt = createVirtualizer(el, { count: 10, estimateSize: 36 });
    const afterAttachCount = buildSpy.mock.calls.length;

    virt.measureElement(0, 50);
    virt.measureElement(1, 60);
    virt.measureElement(2, 70);

    // Still within same microtask tick — no extra buildOffsets yet
    expect(buildSpy.mock.calls.length).toBe(afterAttachCount);

    await flushMicrotasks();

    // Exactly one extra buildOffsets after the microtask
    expect(buildSpy.mock.calls.length).toBe(afterAttachCount + 1);

    buildSpy.mockRestore();
    virt.destroy();
  });
});

// ─── invalidate ──────────────────────────────────────────────────────────────

describe('invalidate', () => {
  test('clears measured heights and resets to estimated sizes', async () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 5, estimateSize: 36 });

    virt.measureElement(0, 100);
    await flushMicrotasks();
    expect(virt.getTotalSize()).toBe(100 + 4 * 36);

    virt.invalidate();
    expect(virt.getTotalSize()).toBe(5 * 36);
    virt.destroy();
  });

  test('onChange does NOT fire when invalidate is called before attach', () => {
    const onChange = vi.fn();
    const virt = new Virtualizer({ count: 5, estimateSize: 36, onChange });

    virt.invalidate();
    expect(onChange).not.toHaveBeenCalled();

    const el = makeContainer(200);

    virt.attach(el);
    expect(onChange).toHaveBeenCalledOnce();
    virt.destroy();
  });
});

// ─── scrollToIndex ────────────────────────────────────────────────────────────

describe('scrollToIndex', () => {
  test('no-ops when count is 0', () => {
    const el = makeContainer(200, 123);
    const virt = createVirtualizer(el, { count: 0, estimateSize: 36 });

    virt.scrollToIndex(0, { align: 'start' });
    expect(el.scrollTop).toBe(123);
    virt.destroy();
  });

  test('align start scrolls itemTop to scrollTop', () => {
    const el = makeContainer(200, 0);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 36 });

    virt.scrollToIndex(10, { align: 'start' });
    expect(el.scrollTop).toBe(10 * 36); // 360
    virt.destroy();
  });

  test('align end positions item at bottom of viewport', () => {
    const el = makeContainer(200, 0);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 36 });

    virt.scrollToIndex(10, { align: 'end' });
    // itemTop=360, itemHeight=36, containerHeight=200 → 360+36-200=196
    expect(el.scrollTop).toBe(196);
    virt.destroy();
  });

  test('align center centers item in viewport', () => {
    const el = makeContainer(200, 0);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 36 });

    virt.scrollToIndex(10, { align: 'center' });
    // itemTop=360, containerHeight=200, itemHeight=36 → 360-(200-36)/2 = 360-82 = 278
    expect(el.scrollTop).toBe(278);
    virt.destroy();
  });

  test('align auto does not scroll when item is already visible', () => {
    let scrolled = false;
    const el = makeContainer(200, 0);

    el.scrollTo = (() => {
      scrolled = true;
    }) as typeof el.scrollTo;

    const virt = createVirtualizer(el, { count: 100, estimateSize: 36 });

    // Item 0 (top=0, height=36) is fully visible in a 200px container
    virt.scrollToIndex(0, { align: 'auto' });
    expect(scrolled).toBe(false);
    virt.destroy();
  });

  test('does not scroll below 0', () => {
    const el = makeContainer(200, 300);
    const virt = createVirtualizer(el, { count: 100, estimateSize: 36 });

    virt.scrollToIndex(0, { align: 'end' });
    // item 0 at end → 0+36-200 = -164 → clamped to 0
    expect(el.scrollTop).toBe(0);
    virt.destroy();
  });

  test('clamps out-of-range index to last item', () => {
    const el = makeContainer(200, 0);
    const virt = createVirtualizer(el, { count: 10, estimateSize: 50 });

    // Index 999 clamps to item 9, then scroll target is clamped to max offset.
    // total=500, viewport=200 => max scrollTop is 300.
    virt.scrollToIndex(999, { align: 'start' });
    expect(el.scrollTop).toBe(300);
    virt.destroy();
  });

  test('clamps negative index to 0', () => {
    const el = makeContainer(200, 500);
    const virt = createVirtualizer(el, { count: 10, estimateSize: 50 });

    virt.scrollToIndex(-5, { align: 'start' });
    expect(el.scrollTop).toBe(0);
    virt.destroy();
  });
});

// ─── scrollToOffset ──────────────────────────────────────────────────────────

describe('scrollToOffset', () => {
  test('clamps offset to max scroll range', () => {
    const el = makeContainer(100, 0);
    const virt = createVirtualizer(el, { count: 5, estimateSize: 20 });

    virt.scrollToOffset(999);
    // total 100, viewport 100 => max scroll offset is 0
    expect(el.scrollTop).toBe(0);
    virt.destroy();
  });

  test('sets scrollTop to given offset', () => {
    const el = makeContainer(200, 0);
    const virt = createVirtualizer(el, { count: 50, estimateSize: 36 });

    virt.scrollToOffset(720);
    expect(el.scrollTop).toBe(720);
    virt.destroy();
  });

  test('clamps negative offset to 0', () => {
    const el = makeContainer(200, 500);
    const virt = createVirtualizer(el, { count: 50, estimateSize: 36 });

    virt.scrollToOffset(-100);
    expect(el.scrollTop).toBe(0);
    virt.destroy();
  });
});

// ─── attach / destroy ────────────────────────────────────────────────────────

describe('attach / destroy', () => {
  test('onChange fires on attach with correct totalSize', () => {
    const el = makeContainer(200);
    const onChange = vi.fn();

    createVirtualizer(el, { count: 10, estimateSize: 36, onChange });

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[1]).toBe(10 * 36);
  });

  test('onChange does NOT fire in constructor before attach', () => {
    const onChange = vi.fn();
    const el = makeContainer(200);
    const virt = new Virtualizer({ count: 10, estimateSize: 36, onChange });

    expect(onChange).not.toHaveBeenCalled();

    virt.attach(el);
    expect(onChange).toHaveBeenCalledOnce();
    virt.destroy();
  });

  test('attach can be called again to re-observe a new element', () => {
    const el1 = makeContainer(200);
    const el2 = makeContainer(300);
    const onChange = vi.fn();
    const virt = createVirtualizer(el1, { count: 10, estimateSize: 36, onChange });

    onChange.mockClear();
    virt.attach(el2);
    expect(onChange).toHaveBeenCalledOnce();
    virt.destroy();
  });

  test('destroy is idempotent and does not throw', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 5 });

    expect(() => virt.destroy()).not.toThrow();
    expect(() => virt.destroy()).not.toThrow();
  });

  test('scroll events are ignored after destroy', () => {
    const el = makeContainer(200, 0);
    const onChange = vi.fn();
    const virt = createVirtualizer(el, { count: 50, estimateSize: 36, onChange });

    virt.destroy();
    onChange.mockClear();

    el.scrollTop = 500;
    el.dispatchEvent(new Event('scroll'));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('Symbol.dispose calls destroy', () => {
    const el = makeContainer(200);
    const virt = createVirtualizer(el, { count: 5 });
    const spy = vi.spyOn(virt, 'destroy');

    virt[Symbol.dispose]();
    expect(spy).toHaveBeenCalledOnce();
  });
});
