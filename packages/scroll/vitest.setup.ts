// Minimal setup: restore jsdom's ResizeObserver and queueMicrotask stubs
// so tests run cleanly without importing extra polyfills.

if (typeof ResizeObserver === 'undefined') {
  (globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// JSDOM does not implement HTMLElement.prototype.scrollTo; stub it so tests
// that exercise scrollToTop/scrollToBottom/scrollToOffset on internally-created
// scroll containers don't throw "target.scrollTo is not a function".
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = function (this: HTMLElement, options?: ScrollToOptions | number) {
    if (typeof options === 'object') {
      if (typeof options.top === 'number') this.scrollTop = options.top;

      if (typeof options.left === 'number') this.scrollLeft = options.left;
    }
  } as typeof HTMLElement.prototype.scrollTo;
}
