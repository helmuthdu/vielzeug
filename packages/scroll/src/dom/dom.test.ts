import { flushMicrotasks, makeContainer } from '../__tests__/test-utils';
import { createDomVirtualList } from './dom';

describe('createDomVirtualList', () => {
  describe('layout and rendering', () => {
    test('renders virtual items and forwards total size', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const render = vi.fn();
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
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
      const scrollEl = makeContainer({ clientHeight: 120, clientWidth: 120 });
      const listEl = document.createElement('div');
      const domList = createDomVirtualList<string>({
        estimateSize: 30,
        horizontal: true,
        listElement: listEl,
        render: () => {},
        scrollElement: scrollEl,
      });

      domList.setItems(['a', 'b', 'c']);

      expect(listEl.style.width).toBe('90px');
      expect(listEl.style.height).toBe('');
      domList.destroy();
    });

    test('recomputes layout when item content changes but length is unchanged', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const rows = [{ size: 20 }, { size: 20 }, { size: 20 }];

      const domList = createDomVirtualList<{ size: number }>({
        estimateSize: (_index, item) => item.size,
        listElement: listEl,
        render: () => {},
        scrollElement: scrollEl,
      });

      domList.setItems(rows);
      expect(listEl.style.height).toBe('60px');

      rows[1]!.size = 60;
      domList.setItems(rows);
      expect(listEl.style.height).toBe('100px');
      domList.destroy();
    });

    test('preserves measured sizes across reorder when getItemKey is stable', async () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const rows = [
        { id: 'a', size: 20 },
        { id: 'b', size: 20 },
        { id: 'c', size: 20 },
      ];
      const render = vi.fn(
        ({ listEl, virtualItems }: { listEl: HTMLElement; virtualItems: Array<{ index: number }> }) => {
          listEl.textContent = '';

          for (const item of virtualItems) {
            const row = document.createElement('div');

            row.dataset.index = String(item.index);
            listEl.appendChild(row);
          }
        },
      );

      const domList = createDomVirtualList<{ id: string; size: number }>({
        estimateSize: (_index, item) => item.size,
        getItemKey: (_index, item) => item.id,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
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
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const rows = [{ size: 20 }, { size: 20 }, { size: 20 }];
      const domList = createDomVirtualList<{ size: number }>({
        estimateSize: (_index, item) => item.size,
        listElement: listEl,
        render: () => {},
        scrollElement: scrollEl,
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

  describe('activation', () => {
    test('clears and resets styles when deactivated', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const clear = vi.fn((el: HTMLElement) => {
        el.textContent = '';
      });
      const domList = createDomVirtualList<string>({
        clear,
        estimateSize: 36,
        listElement: listEl,
        render: () => {},
        scrollElement: scrollEl,
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

    test('setActive is idempotent — calling false twice only clears once', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const clear = vi.fn((el: HTMLElement) => {
        el.textContent = '';
      });
      const domList = createDomVirtualList<string>({
        clear,
        estimateSize: 36,
        listElement: listEl,
        render: () => {},
        scrollElement: scrollEl,
      });

      domList.setItems(Array.from({ length: 5 }, (_, i) => String(i)));
      domList.setActive(false);
      domList.setActive(false); // should be no-op

      expect(clear).toHaveBeenCalledTimes(1);
      domList.destroy();
    });

    test('setActive is idempotent — calling true twice only spawns once', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const render = vi.fn();
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
      });

      domList.setItems(['a', 'b', 'c']);
      render.mockClear();

      domList.setActive(true); // already active — no-op
      domList.setActive(true); // still no-op

      expect(render).not.toHaveBeenCalled();
      domList.destroy();
    });

    test('re-renders when re-activated with existing items', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const render = vi.fn();
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
      });

      domList.setItems(['a', 'b', 'c']);
      render.mockClear();

      domList.setActive(false);
      expect(render).not.toHaveBeenCalled();

      domList.setActive(true);
      expect(render).toHaveBeenCalledTimes(1);
      domList.destroy();
    });

    test('clears and does not render when list is empty', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const render = vi.fn();
      const clear = vi.fn();
      const domList = createDomVirtualList<string>({
        clear,
        estimateSize: 36,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
      });

      domList.setItems([]);

      expect(clear).toHaveBeenCalledTimes(1);
      expect(render).not.toHaveBeenCalled();
      domList.destroy();
    });
  });

  describe('setTarget', () => {
    test('clears previous list and re-renders on new elements', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const nextScrollEl = makeContainer({ clientHeight: 120 });
      const nextListEl = document.createElement('div');
      const render = vi.fn(
        ({ listEl, virtualItems }: { listEl: HTMLElement; virtualItems: Array<{ index: number }> }) => {
          for (const item of virtualItems) {
            const row = document.createElement('div');

            row.className = 'option';
            row.textContent = String(item.index);
            listEl.appendChild(row);
          }
        },
      );
      const clear = vi.fn((el: HTMLElement) => {
        el.textContent = '';
      });

      const domList = createDomVirtualList<string>({
        clear,
        estimateSize: 36,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
      });

      domList.setItems(Array.from({ length: 20 }, (_, i) => String(i)));
      expect(listEl.querySelectorAll('.option').length).toBeGreaterThan(0);

      domList.setTarget(nextScrollEl, nextListEl);

      expect(clear).toHaveBeenCalledTimes(1);
      expect(listEl.querySelectorAll('.option')).toHaveLength(0);
      expect(nextListEl.querySelectorAll('.option').length).toBeGreaterThan(0);
      domList.destroy();
    });

    test('is a no-op when called with the same elements', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const render = vi.fn();
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
      });

      domList.setItems(['a', 'b', 'c']);
      render.mockClear();

      domList.setTarget(scrollEl, listEl); // same refs

      expect(render).not.toHaveBeenCalled();
      domList.destroy();
    });
  });

  describe('controller delegation', () => {
    test('delegates scrollToIndex to underlying virtualizer when active', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        listElement: listEl,
        render: () => {},
        scrollElement: scrollEl,
      });

      domList.setItems(Array.from({ length: 20 }, (_, i) => String(i)));
      domList.scrollToIndex(10, { align: 'start' });

      expect(scrollEl.scrollTop).toBeGreaterThan(0);
      domList.destroy();
    });

    test('measureBatch applies multiple measurements in a single rebuild', async () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const render = vi.fn();
      const rows = ['a', 'b', 'c', 'd', 'e'];
      const domList = createDomVirtualList<string>({
        estimateSize: 20,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
      });

      domList.setItems(rows);
      render.mockClear();

      domList.measureBatch([
        { index: 0, size: 50 },
        { index: 1, size: 80 },
      ]);

      expect(render).not.toHaveBeenCalled(); // queued in microtask
      await flushMicrotasks();

      expect(render).toHaveBeenCalledTimes(1);
      expect(listEl.style.height).toBe(`${50 + 80 + 20 + 20 + 20}px`);
      domList.destroy();
    });

    test('forwards invalidate to the underlying virtualizer', async () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const rows = [
        { id: 'a', size: 20 },
        { id: 'b', size: 20 },
        { id: 'c', size: 20 },
      ];
      const domList = createDomVirtualList<{ id: string; size: number }>({
        estimateSize: (_index, item) => item.size,
        getItemKey: (_index, item) => item.id,
        listElement: listEl,
        render: () => {},
        scrollElement: scrollEl,
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
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        listElement: listEl,
        render: () => {},
        scrollElement: scrollEl,
      });

      domList.destroy();
      domList.destroy();

      expect(true).toBe(true);
    });

    test('setTarget after destroy is a no-op', () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const render = vi.fn();
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
      });

      domList.setItems(['a', 'b', 'c']);
      domList.destroy();
      render.mockClear();

      const newScrollEl = makeContainer({ clientHeight: 120 });
      const newListEl = document.createElement('div');

      domList.setTarget(newScrollEl, newListEl);

      expect(render).not.toHaveBeenCalled();
    });

    test('setItems and measureBatch after destroy are no-ops', async () => {
      const scrollEl = makeContainer({ clientHeight: 120 });
      const listEl = document.createElement('div');
      const render = vi.fn();
      const domList = createDomVirtualList<string>({
        estimateSize: 36,
        listElement: listEl,
        render,
        scrollElement: scrollEl,
      });

      domList.setItems(['a', 'b', 'c']);
      domList.destroy();
      render.mockClear();

      domList.setItems(['d', 'e', 'f']);
      domList.measureBatch([{ index: 0, size: 50 }]);
      await flushMicrotasks();

      expect(render).not.toHaveBeenCalled();
    });
  });
});
