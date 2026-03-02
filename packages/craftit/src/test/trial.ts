/**
 * Craftit - Testing Utilities
 * Complete testing toolkit for Craftit components
 *
 * ⚠️ Requirements:
 * - Requires a DOM environment (browser or jsdom/happy-dom)
 * - Not compatible with pure Node.js environments
 */

import type { ComputedSignal, Ref, Signal } from '..';

// Type for component context (for future use)
export interface ComponentContext {
  el: HTMLElement;
  [key: string]: unknown;
}

// Mock setContext for testing (not used currently)
export const setContext = (_context: ComponentContext | null): void => {
  // No-op for now
};

/**
 * Component test fixture
 * Provides convenient helpers for interacting with mounted components
 */
export interface ComponentFixture<T extends HTMLElement = HTMLElement> {
  /** The component element */
  element: T;
  /** Shadow root (may be null if component doesn't use shadow DOM) */
  shadow: ShadowRoot | null;
  /** Container element (parent of component) */
  container: HTMLElement;
  /** Query a single element within shadow root */
  query: <E extends Element = Element>(selector: string) => E | null;
  /** Query all elements within shadow root */
  queryAll: <E extends Element = Element>(selector: string) => E[];
  /** Wait for reactive updates (signals, effects, DOM) */
  waitForUpdates: () => Promise<void>;
  /** Unmount the component */
  unmount: () => void;
}

// ============================================
// Event Utilities
// ============================================

/**
 * Fire DOM events with proper bubbling and cancelable options
 */
export const fireEvent = {
  /**
   * Fire a blur event
   * @example fireEvent.blur(input)
   */
  blur(element: Element, options?: FocusEventInit): void {
    const event = new FocusEvent('blur', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire a change event (for inputs, selects, etc.)
   * @example fireEvent.change(input)
   */
  change(element: Element, options?: EventInit): void {
    const event = new Event('change', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },
  /**
   * Fire a click event
   * @example fireEvent.click(button)
   */
  click(element: Element, options?: MouseEventInit): void {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire a custom event
   * @example fireEvent.custom(element, 'my-event', { detail: { value: 123 } })
   */
  custom<T = unknown>(element: Element, eventName: string, options?: CustomEventInit<T>): void {
    const event = new CustomEvent(eventName, {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire a focus event
   * @example fireEvent.focus(input)
   */
  focus(element: Element, options?: FocusEventInit): void {
    const event = new FocusEvent('focus', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire an input event (for inputs, textareas, etc.)
   * @example fireEvent.input(input)
   */
  input(element: Element, options?: EventInit): void {
    const event = new Event('input', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire a keydown event
   * @example fireEvent.keyDown(input, { key: 'Enter' })
   */
  keyDown(element: Element, options?: KeyboardEventInit): void {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire a keyup event
   * @example fireEvent.keyUp(input, { key: 'a' })
   */
  keyUp(element: Element, options?: KeyboardEventInit): void {
    const event = new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire a mouseenter event
   * @example fireEvent.mouseEnter(element)
   */
  mouseEnter(element: Element, options?: MouseEventInit): void {
    const event = new MouseEvent('mouseenter', {
      bubbles: false,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire a mouseleave event
   * @example fireEvent.mouseLeave(element)
   */
  mouseLeave(element: Element, options?: MouseEventInit): void {
    const event = new MouseEvent('mouseleave', {
      bubbles: false,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },

  /**
   * Fire a submit event (for forms)
   * @example fireEvent.submit(form)
   */
  submit(element: Element, options?: EventInit): void {
    const event = new Event('submit', {
      bubbles: true,
      cancelable: true,
      ...options,
    });
    element.dispatchEvent(event);
  },
};

// ============================================
// User Interaction Utilities
// ============================================

/**
 * User interaction utilities
 * Higher-level helpers for common user interactions
 */
export const userEvent = {
  /**
   * Clear an input element
   * @example await userEvent.clear(input)
   */
  async clear(element: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
    element.focus();
    fireEvent.focus(element);
    element.value = '';
    fireEvent.input(element);
    fireEvent.change(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  },

  /**
   * Click an element (with proper event sequence)
   * @example await userEvent.click(button)
   */
  async click(element: Element): Promise<void> {
    fireEvent.mouseEnter(element);
    fireEvent.click(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  },

  /**
   * Double click an element
   * Fires the full event sequence: mousedown, mouseup, click (x2), dblclick
   *
   * @example await userEvent.dblClick(button)
   */
  async dblClick(element: Element): Promise<void> {
    // First click sequence
    const mouseDownEvent1 = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    const mouseUpEvent1 = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
    element.dispatchEvent(mouseDownEvent1);
    element.dispatchEvent(mouseUpEvent1);
    fireEvent.click(element);

    // Small delay between clicks
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Second click sequence
    const mouseDownEvent2 = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    const mouseUpEvent2 = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
    element.dispatchEvent(mouseDownEvent2);
    element.dispatchEvent(mouseUpEvent2);
    fireEvent.click(element);

    // Double click event
    const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
    element.dispatchEvent(dblClickEvent);

    await new Promise((resolve) => setTimeout(resolve, 0));
  },

  /**
   * Hover over an element
   * @example await userEvent.hover(element)
   */
  async hover(element: Element): Promise<void> {
    fireEvent.mouseEnter(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  },

  /**
   * Select an option from a select element
   * @example await userEvent.selectOption(select, 'option2')
   */
  async selectOption(element: HTMLSelectElement, value: string | string[]): Promise<void> {
    const values = Array.isArray(value) ? value : [value];

    Array.from(element.options).forEach((option) => {
      option.selected = values.includes(option.value);
    });

    fireEvent.change(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  },
  /**
   * Type text into an input element
   * @example await userEvent.type(input, 'Hello World')
   */
  async type(element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    element.focus();
    fireEvent.focus(element);

    for (const char of text) {
      element.value += char;
      fireEvent.input(element);
      fireEvent.keyDown(element, { key: char });
      fireEvent.keyUp(element, { key: char });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    fireEvent.change(element);
  },

  /**
   * Unhover (leave) an element
   * @example await userEvent.unhover(element)
   */
  async unhover(element: Element): Promise<void> {
    fireEvent.mouseLeave(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  },
};

// ============================================
// Component Mounting
// ============================================

/**
 * Mount a Craftit component for testing
 * Returns a fixture with helpers for interacting with the component
 *
 * @example
 * ```ts
 * const { query, waitForUpdates, unmount } = mount('my-counter');
 *
 * expect(query('.count')?.textContent).toBe('0');
 * fireEvent.click(query('button')!);
 * await waitForUpdates();
 * expect(query('.count')?.textContent).toBe('1');
 *
 * unmount();
 * ```
 *
 * @param tagName - The custom element tag name to mount
 * @param options - Mount options
 * @param options.props - Props to set as attributes
 * @param options.innerHTML - Inner HTML content (for default slot)
 * @param options.attachToDOM - Whether to attach to document.body (default: true)
 * @param options.container - Container to attach to (default: document.body).
 *                            Note: If attachToDOM is false, container is only a reference.
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
  const container = options?.container || document.body;
  if (shouldAttach) {
    container.appendChild(element);
  }

  return {
    container,
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
      await Promise.resolve();
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      await Promise.resolve();
    },
  };
}

// ============================================
// Waiting Utilities
// ============================================

/**
 * Wait for a condition to be true
 * Enhanced version with support for async callbacks and assertions
 *
 * @example
 * await waitFor(() => element.textContent === 'loaded');
 * await waitFor(() => {
 *   expect(element.textContent).toContain('loaded');
 * });
 */
export async function waitFor(
  callback: () => undefined | boolean | Promise<undefined | boolean>,
  options: {
    timeout?: number;
    interval?: number;
    /** Optional message to include in timeout error */
    message?: string;
  } = {},
): Promise<void> {
  const { timeout = 1000, interval = 50, message } = options;
  const startTime = Date.now();
  let lastError: unknown;

  while (Date.now() - startTime < timeout) {
    try {
      const result = await callback();
      if (result !== false) {
        return;
      }
    } catch (error) {
      // Assertion failed, continue waiting
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // Final attempt - throws if still failing
  try {
    const result = await callback();
    if (result === false) {
      const errorMsg = message
        ? `waitFor timed out after ${timeout}ms: ${message}`
        : `waitFor timed out after ${timeout}ms`;
      throw new Error(errorMsg);
    }
  } catch (error) {
    // If we have a last error from assertions, include it
    if (lastError) {
      const errorMsg = message
        ? `waitFor timed out after ${timeout}ms: ${message}\nLast error: ${lastError}`
        : `waitFor timed out after ${timeout}ms\nLast error: ${lastError}`;
      throw new Error(errorMsg);
    }
    throw error;
  }
}

/**
 * Wait for an element to appear in the DOM
 *
 * @example
 * const button = await waitForElement(() => container.querySelector('button'));
 */
export async function waitForElement<T extends Element = Element>(
  query: () => T | null,
  options: {
    timeout?: number;
    interval?: number;
  } = {},
): Promise<T> {
  const { timeout = 1000, interval = 50 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = query();
    if (element) {
      return element;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  const element = query();
  if (!element) {
    throw new Error('Element not found within timeout');
  }
  return element;
}

/**
 * Wait for element to disappear from the DOM
 *
 * @example
 * await waitForElementToBeRemoved(() => container.querySelector('.loading'));
 */
export async function waitForElementToBeRemoved(
  query: () => Element | null,
  options: {
    timeout?: number;
    interval?: number;
  } = {},
): Promise<void> {
  await waitFor(() => query() === null, options);
}

/**
 * Wait for a signal to reach a specific value
 *
 * @example
 * const loading = signal(true);
 * fetchData().then(() => loading.value = false);
 * await waitForSignal(loading, false);
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

  await waitFor(() => signal.value === expectedValue, { interval, timeout });
}

/**
 * Wait for a ref to be populated
 *
 * @example
 * const buttonRef = ref<HTMLButtonElement>();
 * await waitForRef(buttonRef);
 */
export async function waitForRef<T extends Element | null>(
  ref: Ref<T>,
  options?: {
    timeout?: number;
    interval?: number;
  },
): Promise<void> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 10;

  await waitFor(() => ref.value !== null, { interval, timeout });
}

// ============================================
// Context Utilities
// ============================================

/**
 * Create a test context for running code that requires a component context
 * Useful for testing hooks and composables in isolation
 *
 * @example
 * const context = createTestContext();
 * setContext(context);
 * // ... test your logic
 * setContext(null);
 */
export function createTestContext(options?: { name?: string; element?: HTMLElement }): ComponentContext {
  const element = options?.element || document.createElement('div');
  const shadow = element.attachShadow({ mode: 'open' });

  return {
    cleanups: new Set(),
    el: element,
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
 * const doubled = runInContext(() => {
 *   const count = signal(5);
 *   return computed(() => count.value * 2).value;
 * });
 * expect(doubled).toBe(10);
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

// ============================================
// Helper Utilities
// ============================================

/**
 * Create a mock component for testing
 * Useful for testing components that depend on other components
 *
 * @example
 * // Simple static mock
 * createMockComponent('mock-child', () => '<div>Mocked</div>');
 *
 * // Using html template (will be converted to string)
 * createMockComponent('mock-child', () => html`<div>Mocked</div>`);
 *
 * @param tagName - The custom element tag name
 * @param template - Function returning template content (string or TemplateResult)
 */
export function createMockComponent(tagName: string, template: () => string | { toString(): string }): void {
  if (customElements.get(tagName)) {
    return; // Already defined
  }

  customElements.define(
    tagName,
    class extends HTMLElement {
      connectedCallback() {
        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = String(template());
      }
    },
  );
}

/**
 * Cleanup all mounted components
 * Useful in afterEach hooks
 *
 * @example
 * afterEach(() => {
 *   cleanup();
 * });
 */
export function cleanup(): void {
  document.body.innerHTML = '';
}
