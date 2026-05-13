import { createDomVirtualList } from './dom';

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve));

function makeContainer(clientHeight = 200, clientWidth = 320): HTMLElement {
  let scrollTop = 0;
  let scrollLeft = 0;
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

describe('createDomVirtualList', () => {
  describe('layout and rendering', () => {
    test('renders virtual items and forwards total size', () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const render = vi.fn();
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render,
      });

      domList.setItems(['a', 'b', 'c', 'd']);

      expect(render).toHaveBeenCalledTimes(1);
      expect(render.mock.calls[0]?.[0]?.totalSize).toBe(144);
      expect(listEl.style.height).toBe('144px');
      expect(listEl.style.position).toBe('relative');
      expect(listEl.style.contain).toBe('layout');
      domList.destroy();
    });

    test('writes width instead of height in horizontal mode', () => {
      const scrollEl = makeContainer(120, 120);
      const listEl = document.createElement('div');
      const domList = createDomVirtualList<string>({
        estimateSize: 30,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        horizontal: true,
        render: () => {},
      });

      domList.setItems(['a', 'b', 'c']);

      expect(listEl.style.width).toBe('90px');
      expect(listEl.style.height).toBe('');
      domList.destroy();
    });

    test('recomputes layout when item content changes but length is unchanged', () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const rows = [{ size: 20 }, { size: 20 }, { size: 20 }];

      const domList = createDomVirtualList<{ size: number }>({
        estimateSize: (_index, item) => item.size,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render: () => {},
      });

      domList.setItems(rows);
      expect(listEl.style.height).toBe('60px');

      rows[1]!.size = 60;
      domList.setItems(rows);
      expect(listEl.style.height).toBe('100px');
      domList.destroy();
    });

    test('preserves measured sizes across reorder when getItemKey is stable', async () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const rows = [
        { id: 'a', size: 20 },
        { id: 'b', size: 20 },
        { id: 'c', size: 20 },
      ];
      const render = vi.fn(({ listEl, virtualItems }: { listEl: HTMLElement; virtualItems: Array<{ index: number }> }) => {
        listEl.textContent = '';

        for (const item of virtualItems) {
          const row = document.createElement('div');

          row.dataset.index = String(item.index);
          listEl.appendChild(row);
        }
      });

      const domList = createDomVirtualList<{ id: string; size: number }>({
        estimateSize: (_index, item) => item.size,
        getItemKey: (_index, item) => item.id,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render,
      });

      domList.setItems(rows);

      domList.measure(1, 100);
      await flushMicrotasks();

      expect(listEl.style.height).toBe('140px');

      render.mockClear();
      domList.setItems([rows[1]!, rows[0]!, rows[2]!]);

      expect(listEl.style.height).toBe('140px');
      expect(render).toHaveBeenCalledTimes(1);

      const latestArgs = render.mock.calls[0]?.[0] as {
        totalSize: number;
        virtualItems: Array<{ index: number; size: number }>;
      };

      expect(latestArgs.totalSize).toBe(140);
      expect(latestArgs.virtualItems.find((item) => item.index === 0)?.size).toBe(100);
      expect(latestArgs.virtualItems.find((item) => item.index === 1)?.size).toBe(20);

      domList.destroy();
    });

    test('drops measured sizes on setItems when no getItemKey is provided', async () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const rows = [{ size: 20 }, { size: 20 }, { size: 20 }];
      const domList = createDomVirtualList<{ size: number }>({
        estimateSize: (_index, item) => item.size,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render: () => {},
      });

      domList.setItems(rows);
      domList.measure(1, 100);
      await flushMicrotasks();

      expect(listEl.style.height).toBe('140px');

      domList.setItems(rows);

      expect(listEl.style.height).toBe('60px');

      domList.destroy();
    });
  });

  describe('activation and target availability', () => {
    test('clears and resets styles when deactivated', () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const clear = vi.fn((el: HTMLElement) => {
        el.textContent = '';
      });
      const domList = createDomVirtualList<string>({
        clear,
        estimateSize: 36,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render: () => {},
      });

      domList.setItems(Array.from({ length: 20 }, (_, i) => String(i)));
      domList.setActive(false);

      expect(clear).toHaveBeenCalledTimes(1);
      expect(listEl.style.height).toBe('');
      expect(listEl.style.width).toBe('');
      expect(listEl.style.position).toBe('');
      expect(listEl.style.contain).toBe('');
      domList.destroy();
    });

    test('clears and does not render when list is empty', () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const render = vi.fn();
      const clear = vi.fn();
      const domList = createDomVirtualList<string>({
        clear,
        estimateSize: 36,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render,
      });

      domList.setItems([]);

      expect(clear).toHaveBeenCalledTimes(1);
      expect(render).not.toHaveBeenCalled();
      domList.destroy();
    });

    test('safely no-ops when scroll target is unavailable', () => {
      const listEl = document.createElement('div');
      const render = vi.fn();
      const clear = vi.fn();
      const domList = createDomVirtualList<string>({
        clear,
        estimateSize: 36,
        getListElement: () => listEl,
        getScrollElement: () => null,
        render,
      });

      domList.setItems(['a', 'b']);

      expect(clear).toHaveBeenCalledTimes(1);
      expect(render).not.toHaveBeenCalled();
      domList.destroy();
    });
  });

  describe('controller behavior', () => {
    test('clears previous list when target element changes', () => {
      const scrollEl = makeContainer(120);
      const nextScrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const nextListEl = document.createElement('div');
      const clear = vi.fn((el: HTMLElement) => {
        el.textContent = '';
      });
      let useNextTarget = false;

      const domList = createDomVirtualList<string>({
        clear,
        estimateSize: 36,
        getListElement: () => (useNextTarget ? nextListEl : listEl),
        getScrollElement: () => (useNextTarget ? nextScrollEl : scrollEl),
        render: ({ listEl, virtualItems }) => {
          for (const item of virtualItems) {
            const row = document.createElement('div');

            row.className = 'option';
            row.textContent = String(item.index);
            listEl.appendChild(row);
          }
        },
      });

      domList.setItems(Array.from({ length: 20 }, (_, i) => String(i)));
      expect(listEl.querySelectorAll('.option').length).toBeGreaterThan(0);

      useNextTarget = true;
      domList.setItems(Array.from({ length: 20 }, (_, i) => String(i)));

      expect(clear).toHaveBeenCalledTimes(1);
      expect(listEl.querySelectorAll('.option')).toHaveLength(0);
      expect(nextListEl.querySelectorAll('.option').length).toBeGreaterThan(0);
      domList.destroy();
    });

    test('delegates scrollToIndex to underlying virtualizer when active', () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render: () => {},
      });

      domList.setItems(Array.from({ length: 20 }, (_, i) => String(i)));
      domList.scrollToIndex(10, { align: 'start' });

      expect(scrollEl.scrollTop).toBeGreaterThan(0);
      domList.destroy();
    });

    test('forwards invalidate to the underlying virtualizer', async () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const rows = [{ id: 'a', size: 20 }, { id: 'b', size: 20 }, { id: 'c', size: 20 }];
      const domList = createDomVirtualList<{ id: string; size: number }>({
        estimateSize: (_index, item) => item.size,
        getItemKey: (_index, item) => item.id,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render: () => {},
      });

      domList.setItems(rows);
      domList.measure(1, 100);
      await flushMicrotasks();

      expect(listEl.style.height).toBe('140px');

      domList.invalidate();

      expect(listEl.style.height).toBe('60px');
      domList.destroy();
    });

    test('destroy is safe to call repeatedly', () => {
      const scrollEl = makeContainer(120);
      const listEl = document.createElement('div');
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        getListElement: () => listEl,
        getScrollElement: () => scrollEl,
        render: () => {},
      });

      domList.destroy();
      domList.destroy();

      expect(true).toBe(true);
    });
  });
});
