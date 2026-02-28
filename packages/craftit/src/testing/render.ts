/**
 * Craftit - Testing Utilities
 * Vitest-friendly utilities for testing Craftit components
 *
 * Philosophy:
 * - Use Vitest for: test running, assertions (expect), mocking (vi), coverage
 * - Use Craftit test for: component mounting, shadow DOM access, signal/ref helpers
 *
 * This module complements Vitest, not replaces it.
 */

import { type ComponentContext, setContext } from '../composables/context';
import type { Ref } from '../composables/ref';
import type { ComputedSignal, Signal } from '../core/signal';

/**
 * Component test fixture
 * Provides convenient helpers for interacting with mounted components
 */
export interface ComponentFixture<T extends HTMLElement = HTMLElement> {
  /** The component element */
  element: T;
  /** Shadow root (may be null if component doesn't use shadow DOM) */
  shadow: ShadowRoot | null;
  /** Query a single element within shadow root */
  query: <E extends Element = Element>(selector: string) => E | null;
  /** Query all elements within shadow root */
  queryAll: <E extends Element = Element>(selector: string) => E[];
  /** Wait for reactive updates (signals, effects, DOM) */
  waitForUpdates: () => Promise<void>;
  /** Unmount the component */
  unmount: () => void;
}

/**
 * Mount a Craftit component for testing
 * Returns a fixture with helpers for interacting with the component
 *
 * @example
 * ```ts
 * import { expect, test } from 'vitest';
 * import { mount } from 'craftit/test';
 *
 * test('counter increments', async () => {
 *   const { query, waitForUpdates, unmount } = mount('my-counter');
 *
 *   expect(query('.count')?.textContent).toBe('0');
 *   (query('button') as HTMLButtonElement)?.click();
 *   await waitForUpdates();
 *   expect(query('.count')?.textContent).toBe('1');
 *
 *   unmount();
 * });
 * ```
 */
export function mount<T extends HTMLElement = HTMLElement>(
  tagName: string,
  options?: {
    /** Props to set as attributes */
    props?: Record<string, string | number | boolean>;
    /** Inner HTML content (for default slot) */
    innerHTML?: string;
    /** Whether to attach to document.body (default: true) */
    attachToDOM?: boolean;
    /** Container to attach to (default: document.body) */
    container?: HTMLElement;
  },
): ComponentFixture<T> {
  const element = document.createElement(tagName) as T;

  // Set props as attributes
  if (options?.props) {
    for (const [key, value] of Object.entries(options.props)) {
      if (typeof value === 'boolean') {
        if (value) {
          element.setAttribute(key, '');
        }
      } else {
        element.setAttribute(key, String(value));
      }
    }
  }

  // Set inner HTML (for slot content)
  if (options?.innerHTML) {
    element.innerHTML = options.innerHTML;
  }

  // Attach to DOM (triggers connectedCallback)
  const shouldAttach = options?.attachToDOM !== false;
  if (shouldAttach) {
    const container = options?.container || document.body;
    container.appendChild(element);
  }

  return {
    element,

    // Query methods for shadow DOM
    query<E extends Element = Element>(selector: string): E | null {
      return (element.shadowRoot?.querySelector(selector) as E) || null;
    },

    queryAll<E extends Element = Element>(selector: string): E[] {
      return Array.from(element.shadowRoot?.querySelectorAll(selector) || []) as E[];
    },
    shadow: element.shadowRoot,

    // Cleanup
    unmount(): void {
      element.remove();
    },

    // Wait for all reactive updates to complete
    async waitForUpdates(): Promise<void> {
      // Wait for microtasks (effects, promises)
      await Promise.resolve();
      // Wait for requestAnimationFrame (DOM updates)
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      // One more microtask for good measure
      await Promise.resolve();
    },
  };
}

/**
 * Create a test context for running code that requires a component context
 * Useful for testing hooks and composables in isolation
 *
 * @example
 * ```ts
 * const context = createTestContext();
 * setContext(context);
 *
 * const count = signal(0);
 * onMount(() => console.log('mounted'));
 * // ... test your logic
 *
 * setContext(null);
 * ```
 */
export function createTestContext(options?: { name?: string; element?: HTMLElement }): ComponentContext {
  const element = options?.element || document.createElement('div');
  const shadow = element.attachShadow({ mode: 'open' });

  return {
    cleanups: new Set(),
    element,
    mountCallbacks: [],
    mounted: false,
    name: options?.name || 'test-component',
    parent: null,
    provides: new Map(),
    shadow,
    unmountCallbacks: [],
    updateCallbacks: [],
  };
}

/**
 * Run code within a component context
 * Convenient wrapper around createTestContext
 *
 * @example
 * ```ts
 * import { expect } from 'vitest';
 *
 * const doubled = runInContext(() => {
 *   const count = signal(5);
 *   return computed(() => count.value * 2).value;
 * });
 *
 * expect(doubled).toBe(10);
 * ```
 */
export function runInContext<T>(fn: () => T, options?: { name?: string }): T {
  const context = createTestContext(options);
  setContext(context);
  try {
    return fn();
  } finally {
    setContext(null);
  }
}

/**
 * Wait for a signal to reach a specific value
 * Useful for testing async signal updates
 *
 * @example
 * ```ts
 * import { expect } from 'vitest';
 *
 * const loading = signal(true);
 * fetchData().then(() => loading.value = false);
 *
 * await waitForSignal(loading, false);
 * expect(loading.value).toBe(false);
 * ```
 */
export async function waitForSignal<T>(
  signal: Signal<T> | ComputedSignal<T>,
  expectedValue: T,
  options?: {
    timeout?: number;
    interval?: number;
  },
): Promise<void> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 10;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (signal.value === expectedValue) {
        resolve();
        return;
      }

      if (Date.now() - start > timeout) {
        reject(new Error(`Timeout: signal never reached ${expectedValue} (current: ${signal.value})`));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Wait for a ref to be populated
 * Useful for testing ref bindings
 *
 * @example
 * ```ts
 * import { expect } from 'vitest';
 *
 * const buttonRef = ref<HTMLButtonElement>();
 * // ... component with ref=${buttonRef}
 *
 * await waitForRef(buttonRef);
 * expect(buttonRef.value).toBeInstanceOf(HTMLButtonElement);
 * ```
 */
export async function waitForRef<T>(
  ref: Ref<T>,
  options?: {
    timeout?: number;
    interval?: number;
  },
): Promise<void> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 10;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (ref.value !== null) {
        resolve();
        return;
      }

      if (Date.now() - start > timeout) {
        reject(new Error('Timeout: ref was never populated'));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Wait for a condition to be true
 * Generic async waiting utility
 *
 * @example
 * ```ts
 * await waitFor(() => element.classList.contains('loaded'));
 * ```
 */
export async function waitFor(
  condition: () => boolean,
  options?: {
    timeout?: number;
    interval?: number;
  },
): Promise<void> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 10;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (condition()) {
        resolve();
        return;
      }

      if (Date.now() - start > timeout) {
        reject(new Error(`Timeout: condition never became true after ${timeout}ms`));
        return;
      }

      setTimeout(check, interval);
    };

    check();
  });
}
