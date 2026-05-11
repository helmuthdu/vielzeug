import { createDomVirtualList } from './dom';

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
  test('renders virtual items and forwards totalSize', () => {
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

    expect(render).toHaveBeenCalled();
    expect(render.mock.calls[0]?.[0]?.totalSize).toBe(144);
    expect(listEl.style.height).toBe('144px');
    expect(listEl.style.position).toBe('relative');
    expect(listEl.style.contain).toBe('layout');
    domList.destroy();
  });

  test('supports keyed item sizing by passing getItemKey', () => {
    const scrollEl = makeContainer(120);
    const listEl = document.createElement('div');
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const render = vi.fn(({ virtualItems }) => {
      for (const item of virtualItems) {
        if (rows[item.index]?.id === 'b') item.size = 40;
      }
    });

    const domList = createDomVirtualList<{ id: string }>({
      estimateSize: 20,
      getItemKey: (item) => item.id,
      getListElement: () => listEl,
      getScrollElement: () => scrollEl,
      render,
    });

    domList.setItems(rows);
    expect(render).toHaveBeenCalled();
    domList.destroy();
  });

  test('horizontal mode writes width instead of height', () => {
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

  test('setItems updates layout even when length is unchanged', () => {
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

  test('clear/reset styles on inactive or empty and delegate scrollToIndex', () => {
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
    domList.scrollToIndex(10, { align: 'start' });
    expect(scrollEl.scrollTop).toBeGreaterThan(0);

    domList.setActive(false);
    expect(clear).toHaveBeenCalled();
    expect(listEl.style.height).toBe('');
    expect(listEl.style.width).toBe('');
    expect(listEl.style.position).toBe('');
    expect(listEl.style.contain).toBe('');

    domList.setActive(true);
    domList.setItems([], { remeasure: true });
    expect(clear).toHaveBeenCalledTimes(2);
  });
});
