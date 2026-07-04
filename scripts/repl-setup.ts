/**
 * Global polyfills/mocks for the REPL validate test environment.
 * jsdom does not ship ResizeObserver, Worker, or HTMLElement.scrollTo — all
 * three are needed by scroll (and familiar, for Worker) examples.
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

// HTMLElement.scrollTo stub — used by @vielzeug/scroll's scrollToIndex/scrollToCell/etc.
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = function (this: HTMLElement, options?: ScrollToOptions | number) {
    if (typeof options === 'object') {
      if (typeof options.top === 'number') this.scrollTop = options.top;

      if (typeof options.left === 'number') this.scrollLeft = options.left;
    }
  } as typeof HTMLElement.prototype.scrollTo;
}
