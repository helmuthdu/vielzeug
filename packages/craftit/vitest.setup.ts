import { afterEach, vi } from 'vitest';
import { install } from './src/test';

install(afterEach);

globalThis.window.URL.createObjectURL = vi.fn();

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
