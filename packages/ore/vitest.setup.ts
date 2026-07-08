import axe from 'axe-core';
import { afterEach, vi } from 'vitest';

import { install } from './src/testing';

install(afterEach);

globalThis.window.URL.createObjectURL = vi.fn();

// ── Axe-core a11y helper ──────────────────────────────────────────────────────
// Usage in any test:
//   const results = await axeCheck(fixture.element);
//   expect(results.violations).toHaveLength(0);
//
// axe-core targets real browsers. Under jsdom there is no CSS box model and
// `getComputedStyle` is a stub, so rules that depend on layout, geometry, or
// computed colour produce false positives/negatives. Disable those here so the
// structural/ARIA/name/role checks jsdom CAN evaluate stay reliable — ore's a11y
// contract (see AGENTS.md) is limited to that structural plumbing, not full
// pattern correctness, so this is the complete set of checks it needs.
const JSDOM_UNRELIABLE_RULES: Record<string, { enabled: false }> = {
  'color-contrast': { enabled: false },
  'color-contrast-enhanced': { enabled: false },
  'scrollable-region-focusable': { enabled: false },
  'target-size': { enabled: false },
};

export async function axeCheck(node: Element, options: axe.RunOptions = {}): Promise<axe.AxeResults> {
  return axe.run(node, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
    ...options,
    rules: { ...JSDOM_UNRELIABLE_RULES, ...options.rules },
  });
}

// Make it globally available without imports in each test file
(globalThis as any).axeCheck = axeCheck;

declare global {
  var axeCheck: (node: Element, options?: axe.RunOptions) => Promise<axe.AxeResults>;
}

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

// Polyfill window.matchMedia for JSDOM
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = vi.fn().mockImplementation(
    (query: string) =>
      ({
        addEventListener: vi.fn(),
        addListener: vi.fn(), // deprecated, kept for libraries that still reference it
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
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
