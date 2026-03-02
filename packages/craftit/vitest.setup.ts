import { vi } from 'vitest';

globalThis.window.URL.createObjectURL = vi.fn();

// Polyfill ElementInternals methods for JSDOM
if (typeof ElementInternals !== 'undefined') {
  if (!('setFormValue' in ElementInternals.prototype)) {
    Object.defineProperty(ElementInternals.prototype, 'setFormValue', {
      value: function () {
        // No-op for JSDOM
      },
      writable: true,
      configurable: true,
    });
  }

  if (!('setValidity' in ElementInternals.prototype)) {
    Object.defineProperty(ElementInternals.prototype, 'setValidity', {
      value: function () {
        // No-op for JSDOM
      },
      writable: true,
      configurable: true,
    });
  }

  if (!('reportValidity' in ElementInternals.prototype)) {
    Object.defineProperty(ElementInternals.prototype, 'reportValidity', {
      value: function () {
        return true; // Always valid in tests
      },
      writable: true,
      configurable: true,
    });
  }

  if (!('states' in ElementInternals.prototype)) {
    Object.defineProperty(ElementInternals.prototype, 'states', {
      get: function () {
        if (!this._states) {
          this._states = new Set();
        }
        return this._states;
      },
      configurable: true,
    });
  }
}