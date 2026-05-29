export function makeContainer({
  clientHeight = 200,
  clientWidth = 300,
  scrollLeft = 0,
  scrollTop = 0,
}: {
  clientHeight?: number;
  clientWidth?: number;
  scrollLeft?: number;
  scrollTop?: number;
} = {}): HTMLElement {
  let _scrollTop = scrollTop;
  let _scrollLeft = scrollLeft;
  const el = document.createElement('div');

  Object.defineProperties(el, {
    clientHeight: { configurable: true, get: () => clientHeight },
    clientWidth: { configurable: true, get: () => clientWidth },
    scrollLeft: {
      configurable: true,
      get: () => _scrollLeft,
      set: (v: number) => {
        _scrollLeft = v;
      },
    },
    scrollTop: {
      configurable: true,
      get: () => _scrollTop,
      set: (v: number) => {
        _scrollTop = v;
      },
    },
  });

  el.scrollTo = ((options?: ScrollToOptions) => {
    if (typeof options?.top === 'number') _scrollTop = options.top;

    if (typeof options?.left === 'number') _scrollLeft = options.left;
  }) as typeof el.scrollTo;

  return el;
}

export function makeWindow(innerHeight = 300, innerWidth = 400): Window {
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
    document: {} as Document,
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

export const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve));

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
