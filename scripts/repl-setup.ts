/**
 * Global polyfills/mocks for the REPL validate test environment.
 * jsdom does not ship ResizeObserver or Worker — both are needed by scroll
 * and familiar examples respectively.
 */

// ResizeObserver stub — used by @vielzeug/scroll
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
