import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMediaQuery, createNetwork, createViewport } from '../index.ts';

type MediaQueryController = {
  readonly list: MediaQueryList;
  readonly listenerCount: () => number;
  setMatches(matches: boolean): void;
};

function createMediaQueryController(initialMatches = false): MediaQueryController {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const list = {
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') listeners.add(listener);
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    dispatchEvent: () => true,
    get matches() {
      return matches;
    },
    media: '',
    onchange: null,
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') listeners.delete(listener);
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  } as unknown as MediaQueryList;

  return {
    list,
    listenerCount: () => listeners.size,
    setMatches(next) {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
}

class TestWindow extends EventTarget {
  devicePixelRatio = 1;
  innerHeight = 600;
  innerWidth = 800;
  readonly navigator: Navigator;
  matchMedia = vi.fn<(query: string) => MediaQueryList>();

  constructor(navigator: Navigator = { onLine: true } as Navigator) {
    super();
    this.navigator = navigator;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('window Sentinels', () => {
  it('updates viewport state and removes listeners on disposal', () => {
    const target = new TestWindow();
    const dprQuery = createMediaQueryController();
    target.matchMedia.mockReturnValue(dprQuery.list);
    const sentinel = createViewport({ target: target as unknown as Window });
    const listener = vi.fn();
    const unsubscribe = sentinel.subscribe(listener);

    expect(sentinel.value).toEqual({ dpr: 1, height: 600, width: 800 });

    target.innerWidth = 1024;
    target.innerHeight = 768;
    target.dispatchEvent(new Event('resize'));

    expect(sentinel.value).toEqual({ dpr: 1, height: 768, width: 1024 });
    expect(listener).toHaveBeenCalledOnce();
    expect(dprQuery.listenerCount()).toBe(1);

    unsubscribe();
    sentinel.dispose();
    expect(dprQuery.listenerCount()).toBe(0);
  });

  it('re-arms device-pixel-ratio observation', () => {
    const target = new TestWindow();
    const firstQuery = createMediaQueryController();
    const secondQuery = createMediaQueryController();
    target.matchMedia.mockReturnValueOnce(firstQuery.list).mockReturnValueOnce(secondQuery.list);
    const sentinel = createViewport({ target: target as unknown as Window });

    target.devicePixelRatio = 2;
    firstQuery.setMatches(false);

    expect(sentinel.value.dpr).toBe(2);
    expect(target.matchMedia).toHaveBeenLastCalledWith('(resolution: 2dppx)');
    expect(firstQuery.listenerCount()).toBe(0);
    expect(secondQuery.listenerCount()).toBe(1);

    sentinel.dispose();
  });

  it('updates network state from online and connection events', () => {
    const connection = Object.assign(new EventTarget(), {
      downlink: 10,
      effectiveType: '4g' as const,
      rtt: 20,
      saveData: false,
    });
    const navigator = { connection, onLine: true } as unknown as Navigator;
    const target = new TestWindow(navigator);
    const sentinel = createNetwork({ target: target as unknown as Window });

    expect(sentinel.value).toEqual({
      connection: { downlink: 10, effectiveType: '4g', rtt: 20, saveData: false },
      online: true,
    });

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    target.dispatchEvent(new Event('offline'));
    expect(sentinel.value.online).toBe(false);

    sentinel.dispose();
  });

  it('updates media query state and removes its listener', () => {
    const target = new TestWindow();
    const mediaQuery = createMediaQueryController();
    target.matchMedia.mockReturnValue(mediaQuery.list);
    const sentinel = createMediaQuery('(min-width: 40rem)', { target: target as unknown as Window });

    expect(sentinel.value.matches).toBe(false);

    mediaQuery.setMatches(true);
    expect(sentinel.value.matches).toBe(true);

    sentinel.dispose();
    expect(mediaQuery.listenerCount()).toBe(0);
  });
});
