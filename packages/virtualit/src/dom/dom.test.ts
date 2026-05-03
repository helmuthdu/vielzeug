import { createDomVirtualList } from './dom';

function makeContainer(clientHeight = 200): HTMLElement {
  let scrollTop = 0;
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

describe('createDomVirtualList', () => {
  test('renders virtual items when enabled with items', () => {
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
    expect(listEl.style.height).toBe('144px');
    expect(listEl.style.position).toBe('relative');
    expect(listEl.style.contain).toBe('layout');

    domList.destroy();
  });

  test('render callback receives totalSize', () => {
    const scrollEl = makeContainer(120);
    const listEl = document.createElement('div');
    const render = vi.fn();
    const domList = createDomVirtualList<string>({
      estimateSize: 20,
      getListElement: () => listEl,
      getScrollElement: () => scrollEl,
      render,
    });

    domList.setItems(['a', 'b', 'c']);

    expect(render).toHaveBeenCalled();
    expect(render.mock.calls[0]?.[0]?.totalSize).toBe(60);
    domList.destroy();
  });

  test('updates list height when items shrink', () => {
    const scrollEl = makeContainer(120);
    const listEl = document.createElement('div');
    const domList = createDomVirtualList<string>({
      estimateSize: 36,
      getListElement: () => listEl,
      getScrollElement: () => scrollEl,
      render: () => {},
    });

    domList.setItems(['a', 'b', 'c', 'd']);
    expect(listEl.style.height).toBe('144px');

    domList.setItems(['a']);
    expect(listEl.style.height).toBe('36px');

    domList.destroy();
  });

  test('clears and resets styles when inactive or empty', () => {
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

    domList.setItems(['a', 'b']);
    expect(listEl.style.height).not.toBe('');

    domList.setActive(false);

    expect(clear).toHaveBeenCalled();
    expect(listEl.style.height).toBe('');
    expect(listEl.style.position).toBe('');
    expect(listEl.style.contain).toBe('');

    domList.setActive(true);
    domList.setItems([], { remeasure: true });
    expect(clear).toHaveBeenCalledTimes(2);
  });

  test('scrollToIndex delegates to virtualizer after update', () => {
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
});
