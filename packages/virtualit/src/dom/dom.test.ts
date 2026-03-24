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
  test('renders virtual items when enabled with items', async () => {
    const scrollEl = makeContainer(120);
    const listEl = document.createElement('div');
    const clear = vi.fn();
    const render = vi.fn();
    const domList = createDomVirtualList<string>({
      clear,
      estimateSize: 36,
      getListElement: () => listEl,
      getScrollElement: () => scrollEl,
      render,
    });

    domList.update(['a', 'b', 'c', 'd'], true);

    expect(render).toHaveBeenCalled();
    expect(listEl.style.height).not.toBe('');
    expect(clear).not.toHaveBeenCalled();

    domList.destroy();
  });

  test('clears and resets styles when disabled or empty', () => {
    const scrollEl = makeContainer(120);
    const listEl = document.createElement('div');
    const clear = vi.fn();
    const domList = createDomVirtualList<string>({
      clear,
      estimateSize: 36,
      getListElement: () => listEl,
      getScrollElement: () => scrollEl,
      render: () => {},
    });

    domList.update(['a', 'b'], true);
    expect(listEl.style.height).not.toBe('');

    domList.update([], true);

    expect(clear).toHaveBeenCalled();
    expect(listEl.style.height).toBe('');
    expect(listEl.style.position).toBe('');
    expect(listEl.style.contain).toBe('');
  });

  test('scrollToIndex delegates to virtualizer after update', () => {
    const scrollEl = makeContainer(120);
    const listEl = document.createElement('div');
    const domList = createDomVirtualList<string>({
      clear: () => {},
      estimateSize: 36,
      getListElement: () => listEl,
      getScrollElement: () => scrollEl,
      render: () => {},
    });

    domList.update(
      Array.from({ length: 20 }, (_, i) => String(i)),
      true,
    );
    domList.scrollToIndex(10, { align: 'start' });

    expect(scrollEl.scrollTop).toBeGreaterThan(0);
  });
});
