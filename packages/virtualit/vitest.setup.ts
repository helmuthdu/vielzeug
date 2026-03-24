// Minimal setup: restore jsdom's ResizeObserver and queueMicrotask stubs
// so tests run cleanly without importing extra polyfills.

if (typeof ResizeObserver === 'undefined') {
  (globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
