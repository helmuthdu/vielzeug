import { afterEach, vi } from 'vitest';

import { install } from './src/testing';

install(afterEach);

globalThis.window.URL.createObjectURL = vi.fn();

// Polyfill ResizeObserver for JSDOM
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(_cb: ResizeObserverCallback) {}
  } as unknown as typeof ResizeObserver;
}

// Polyfill IntersectionObserver for JSDOM
if (!('IntersectionObserver' in globalThis)) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds: readonly number[] = [];
    constructor(_cb: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// Polyfill ElementInternals methods for JSDOM
if (typeof ElementInternals !== 'undefined') {
  if (!('setFormValue' in ElementInternals.prototype)) {
    Object.defineProperty(ElementInternals.prototype, 'setFormValue', {
      configurable: true,
      value: () => {},
      writable: true,
    });
  }

  if (!('setValidity' in ElementInternals.prototype)) {
    Object.defineProperty(ElementInternals.prototype, 'setValidity', {
      configurable: true,
      value: () => {},
      writable: true,
    });
  }

  if (!('reportValidity' in ElementInternals.prototype)) {
    Object.defineProperty(ElementInternals.prototype, 'reportValidity', {
      configurable: true,
      value: () => true,
      writable: true,
    });
  }

  if (!('states' in ElementInternals.prototype)) {
    Object.defineProperty(ElementInternals.prototype, 'states', {
      configurable: true,
      get: function () {
        if (!this._states) {
          this._states = new Set();
        }

        return this._states;
      },
    });
  }
}
