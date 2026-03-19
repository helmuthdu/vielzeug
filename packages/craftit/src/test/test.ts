/**
 * Testing utilities for Craftit components
 *
 * ⚠️ Requires DOM environment (browser / jsdom / happy-dom)
 */

import { defineComponent, type BuildPropSchema, type DefineComponentOptions } from '../core/define';
import { _resetMarkerIndex } from '../core/template';
import { _resetIdCounter } from '../core/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Fixture<T extends HTMLElement = HTMLElement> {
  /** The component element */
  element: T;
  /** The component's shadow root */
  readonly shadow: ShadowRoot;
  /** Query a single element within shadow root */
  query<E extends Element = Element>(selector: string): E | null;
  /** Query all elements within shadow root */
  queryAll<E extends Element = Element>(selector: string): E[];
  /** Query the first element whose trimmed text content matches */
  queryByText<E extends Element = Element>(text: string, selector?: string): E | null;
  /** Query all elements whose trimmed text content matches */
  queryAllByText<E extends Element = Element>(text: string, selector?: string): E[];
  /** Query a single element by its `data-testid` attribute */
  queryByTestId<E extends Element = Element>(testId: string): E | null;
  /** Query all elements by their `data-testid` attribute */
  queryAllByTestId<E extends Element = Element>(testId: string): E[];
  /** Set an attribute (boolean `false` removes it) then flush */
  attr(name: string, value: string | number | boolean): Promise<void>;
  /** Set multiple attributes then flush */
  attrs(record: Record<string, string | number | boolean>): Promise<void>;
  /** Wait for all reactive updates and animation frames */
  flush(): Promise<void>;
  /** Run a callback then flush — the standard way to trigger and assert a reactive update */
  act(fn: () => unknown): Promise<void>;
  /** Remove the component from the DOM */
  destroy(): void;
}

/** Scoped query helpers for any DOM element — see {@link within} */
export interface QueryScope {
  query<E extends Element = Element>(selector: string): E | null;
  queryAll<E extends Element = Element>(selector: string): E[];
  queryByText<E extends Element = Element>(text: string, selector?: string): E | null;
  queryAllByText<E extends Element = Element>(text: string, selector?: string): E[];
  queryByTestId<E extends Element = Element>(testId: string): E | null;
  queryAllByTestId<E extends Element = Element>(testId: string): E[];
}

export interface MountOptions {
  /** Properties assigned directly onto the element */
  props?: Record<string, unknown>;
  /** HTML attributes to set on the element */
  attrs?: Record<string, string | number | boolean>;
  /** Inner HTML for slot content */
  html?: string;
  /** Parent container (default: document.body) */
  container?: HTMLElement;
  /** Extra defineComponent options when passing an inline setup function */
  componentOptions?: Omit<DefineComponentOptions<any, any>, 'setup' | 'tag'>;
}

type TestComponentOptions<
  Props extends Record<string, unknown> = Record<string, never>,
  Events extends Record<string, unknown> = Record<string, unknown>,
> = Omit<DefineComponentOptions<BuildPropSchema<Props>, Events>, 'tag'>;

export interface WaitOptions {
  /** Maximum wait time in ms (default: 1000) */
  timeout?: number;
  /** Polling interval in ms (default: 50) */
  interval?: number;
  /** Message included in timeout error */
  message?: string;
}

// ─── Test environment state ───────────────────────────────────────────────────

const _mountedElements: HTMLElement[] = [];
let _componentTagCounter = 0;

/**
 * Resets global test counters used for deterministic IDs/markers.
 * @internal
 */
export const _resetCounters = (): void => {
  _resetIdCounter();
  _resetMarkerIndex();
};

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Flush pending reactive updates.
 * Drains the microtask queue completely, then yields one animation frame
 * for any rAF-scheduled work.
 */
export function flush(): Promise<void> {
  // Drain all pending microtasks by repeatedly yielding until the queue is empty.
  // Fixed tick approaches can under-flush when signal batching schedules additional microtasks.
  const drainMicrotasks = (): Promise<void> => {
    let ticks = 0;
    const drain = (): Promise<void> =>
      Promise.resolve().then(() => {
        if (++ticks < 10) return drain();
      });

    return drain();
  };

  return drainMicrotasks().then(
    () =>
      new Promise<void>((r) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => r()) : r())),
  );
}

/**
 * Register auto-cleanup after each test. Call once in your test setup file.
 *
 * @example
 * // vitest.setup.ts
 * import { afterEach } from 'vitest';
 * import { install } from '@vielzeug/craftit/trial';
 * install(afterEach);
 */
export function install(afterEachHook: (fn: () => void) => void): void {
  afterEachHook(cleanup);
}

function applyAttr(element: Element, name: string, value: string | number | boolean): void {
  if (value === false) element.removeAttribute(name);
  else element.setAttribute(name, value === true ? '' : String(value));
}

/**
 * Mount a component into the DOM and return a test fixture.
 *
 * Accepts a registered tag name, an inline setup function, or a component
 * options object. Setup functions are auto-registered with generated tag names.
 *
 * @example — inline setup function
 * const { query } = await mount(() => {
 *   const count = signal(0);
 *   return html`<button @click=${() => count.value++}>${count}</button>`;
 * });
 *
 * @example — registered tag name
 * const { query } = await mount('my-counter');
 */
export async function mount<T extends HTMLElement = HTMLElement>(
  tagOrSetupOrOptions: string,
  options?: MountOptions,
): Promise<Fixture<T>>;
export async function mount<T extends HTMLElement = HTMLElement>(
  tagOrSetupOrOptions: TestComponentOptions['setup'],
  options?: MountOptions,
): Promise<Fixture<T>>;
export async function mount<T extends HTMLElement = HTMLElement>(
  tagOrSetupOrOptions: TestComponentOptions<any, any>,
  options?: MountOptions,
): Promise<Fixture<T>>;
export async function mount<T extends HTMLElement = HTMLElement>(
  tagOrSetupOrOptions: string | TestComponentOptions['setup'] | TestComponentOptions<any, any>,
  options: MountOptions = {},
): Promise<Fixture<T>> {
  const { attrs = {}, componentOptions, container = document.body, html, props = {} } = options;

  let tagName: string;
  let inlineDefinition: TestComponentOptions<any, any> | undefined;

  if (typeof tagOrSetupOrOptions === 'string') {
    tagName = tagOrSetupOrOptions;
  } else if (typeof tagOrSetupOrOptions === 'function') {
    tagName = `trial-${++_componentTagCounter}`;
    inlineDefinition = {
      ...(componentOptions ?? {}),
      setup: tagOrSetupOrOptions as TestComponentOptions<any, any>['setup'],
    };
  } else {
    tagName = `trial-${++_componentTagCounter}`;
    inlineDefinition = tagOrSetupOrOptions;
  }

  if (inlineDefinition) {
    defineComponent({ tag: tagName, ...(inlineDefinition as TestComponentOptions<any, any>) });
  }

  const element = document.createElement(tagName) as T;

  if (html) element.innerHTML = html;

  if (Object.keys(props).length) Object.assign(element, props);

  for (const [name, value] of Object.entries(attrs)) applyAttr(element, name, value);

  container.appendChild(element);
  _mountedElements.push(element);
  await flush();

  return {
    async act(fn) {
      await fn();
      await flush();
    },

    async attr(name, value) {
      applyAttr(element, name, value);
      await flush();
    },

    async attrs(record) {
      for (const [name, value] of Object.entries(record)) applyAttr(element, name, value);
      await flush();
    },

    destroy() {
      element.remove();

      const i = _mountedElements.indexOf(element);

      if (i !== -1) _mountedElements.splice(i, 1);
    },
    element,

    flush,

    query<E extends Element = Element>(selector: string): E | null {
      return element.shadowRoot?.querySelector<E>(selector) ?? null;
    },

    queryAll<E extends Element = Element>(selector: string): E[] {
      return Array.from(element.shadowRoot?.querySelectorAll<E>(selector) ?? []);
    },

    queryAllByTestId<E extends Element = Element>(testId: string): E[] {
      return Array.from(element.shadowRoot?.querySelectorAll<E>(`[data-testid="${testId}"]`) ?? []);
    },

    queryAllByText<E extends Element = Element>(text: string, selector = '*'): E[] {
      return queryAllByText<E>(element.shadowRoot!, text, selector);
    },

    queryByTestId<E extends Element = Element>(testId: string): E | null {
      return element.shadowRoot?.querySelector<E>(`[data-testid="${testId}"]`) ?? null;
    },

    queryByText<E extends Element = Element>(text: string, selector = '*'): E | null {
      return queryByText<E>(element.shadowRoot!, text, selector);
    },

    get shadow(): ShadowRoot {
      return element.shadowRoot!;
    },
  };
}

// ─── Scoped queries ───────────────────────────────────────────────────────────

function queryByText<E extends Element = Element>(
  root: Element | ShadowRoot,
  text: string,
  selector: string,
): E | null {
  for (const el of root.querySelectorAll<E>(selector)) {
    if (el.textContent?.trim() === text) return el;
  }

  return null;
}

function queryAllByText<E extends Element = Element>(root: Element | ShadowRoot, text: string, selector: string): E[] {
  return Array.from(root.querySelectorAll<E>(selector)).filter((el) => el.textContent?.trim() === text);
}

/**
 * Create query helpers scoped to any element — useful for slotted/light DOM content.
 *
 * @example
 * const panel = fixture.query('.panel')!;
 * const { query } = within(panel);
 * expect(query('.title')?.textContent).toBe('Hello');
 */
export function within(element: Element): QueryScope {
  return {
    query: <E extends Element = Element>(selector: string) => element.querySelector<E>(selector),
    queryAll: <E extends Element = Element>(selector: string) => Array.from(element.querySelectorAll<E>(selector)),
    queryAllByTestId: <E extends Element = Element>(testId: string) =>
      Array.from(element.querySelectorAll<E>(`[data-testid="${testId}"]`)),
    queryAllByText: <E extends Element = Element>(text: string, selector = '*') =>
      queryAllByText<E>(element, text, selector),
    queryByTestId: <E extends Element = Element>(testId: string) =>
      element.querySelector<E>(`[data-testid="${testId}"]`),
    queryByText: <E extends Element = Element>(text: string, selector = '*') => queryByText<E>(element, text, selector),
  };
}

// ─── Events ──────────────────────────────────────────────────────────────────

/**
 * Fire low-level DOM events synchronously.
 *
 * @example
 * fire.click(button);
 * fire.keyDown(input, { key: 'Enter' });
 * fire.custom(el, 'value-change', 42);
 */
export const fire = {
  blur: (el: Element, opts?: FocusEventInit) => el.dispatchEvent(new FocusEvent('blur', { bubbles: true, ...opts })),
  change: (el: Element, opts?: EventInit) => el.dispatchEvent(new Event('change', { bubbles: true, ...opts })),
  click: (el: Element, opts?: MouseEventInit) =>
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...opts })),
  custom<D = unknown>(el: Element, name: string, detail?: D, opts?: Omit<CustomEventInit<D>, 'detail'>): void {
    el.dispatchEvent(new CustomEvent<D>(name, { bubbles: true, cancelable: true, detail, ...opts }));
  },
  focus: (el: Element, opts?: FocusEventInit) => el.dispatchEvent(new FocusEvent('focus', { bubbles: true, ...opts })),
  input: (el: Element, opts?: EventInit) => el.dispatchEvent(new Event('input', { bubbles: true, ...opts })),
  keyDown: (el: Element, opts?: KeyboardEventInit) =>
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...opts })),
  keyUp: (el: Element, opts?: KeyboardEventInit) =>
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...opts })),
  mouseEnter: (el: Element, opts?: MouseEventInit) =>
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, ...opts })),
  mouseLeave: (el: Element, opts?: MouseEventInit) =>
    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false, ...opts })),
  submit: (el: Element, opts?: EventInit) =>
    el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true, ...opts })),
} as const;

// ─── User interactions ────────────────────────────────────────────────────────

const tick = (): Promise<void> => Promise.resolve();

/**
 * Higher-level async user interactions that mirror real browser behavior.
 *
 * @example
 * await user.type(input, 'hello');
 * await user.fill(input, 'replacement'); // clear then type
 * await user.click(button);
 * await user.press(input, 'Enter');
 */
export const user = {
  async clear(el: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
    el.focus();
    el.value = '';
    fire.input(el);
    fire.change(el);
    await tick();
  },
  async click(el: Element, opts?: MouseEventInit): Promise<void> {
    fire.mouseEnter(el, opts);
    fire.click(el, opts);
    await tick();
  },

  async dblClick(el: Element): Promise<void> {
    for (let i = 0; i < 2; i++) {
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      fire.click(el);
    }
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    await tick();
  },

  /** Clear existing value and type new text (select-all-and-replace semantics) */
  async fill(el: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    el.focus();
    el.value = '';
    for (const char of text) {
      el.value += char;
      fire.input(el);
      fire.keyDown(el, { key: char });
      fire.keyUp(el, { key: char });
      await tick();
    }
    fire.change(el);
  },

  async hover(el: Element): Promise<void> {
    fire.mouseEnter(el);
    await tick();
  },

  /** Dispatch keydown + keyup for a single key */
  async press(el: Element, key: string, opts?: KeyboardEventInit): Promise<void> {
    fire.keyDown(el, { key, ...opts });
    fire.keyUp(el, { key, ...opts });
    await tick();
  },

  async select(el: HTMLSelectElement, value: string | string[]): Promise<void> {
    const values = Array.isArray(value) ? value : [value];

    for (const opt of el.options) opt.selected = values.includes(opt.value);
    fire.change(el);
    await tick();
  },

  /** Type text character-by-character, appending to any existing value */
  async type(el: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    el.focus();
    for (const char of text) {
      el.value += char;
      fire.input(el);
      fire.keyDown(el, { key: char });
      fire.keyUp(el, { key: char });
      await tick();
    }
    fire.change(el);
  },

  async unhover(el: Element): Promise<void> {
    fire.mouseLeave(el);
    await tick();
  },
} as const;

// ─── Waiting ─────────────────────────────────────────────────────────────────

/**
 * Poll until a callback returns truthy (or void) without throwing.
 * Supports both boolean conditions and `expect()` assertions.
 *
 * - Returns truthy → success
 * - Returns `undefined` (e.g. bare `expect()` call) → success
 * - Returns falsy value → retry
 * - Throws → retry, re-throw original error on timeout
 *
 * @example
 * await waitFor(() => query('.status')?.textContent === 'loaded');
 * await waitFor(() => expect(count).toBe(3));
 */
export async function waitFor(
  fn: () => unknown,
  { interval = 50, message, timeout = 1000 }: WaitOptions = {},
): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  const attempt = async (): Promise<boolean> => {
    try {
      const result = await fn();

      return result === undefined || !!result;
    } catch (e) {
      lastError = e;

      return false;
    }
  };

  while (Date.now() < deadline) {
    if (await attempt()) return;

    await new Promise((r) => setTimeout(r, interval));
  }

  if (await attempt()) return;

  const base = message ?? `waitFor timed out after ${timeout}ms`;

  if (lastError instanceof Error) {
    lastError.message = `${base}\n${lastError.message}`;
    throw lastError;
  }

  throw new Error(lastError != null ? `${base}\nCause: ${lastError}` : base);
}

/**
 * Resolve when the target element emits the given event.
 *
 * @example
 * const promise = waitForEvent(el, 'change');
 * fire.click(trigger);
 * const event = await promise;
 */
export function waitForEvent<T extends Event = Event>(element: Element, name: string, timeout = 1000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`waitForEvent: "${name}" timed out after ${timeout}ms`)), timeout);

    element.addEventListener(
      name,
      (e) => {
        clearTimeout(timer);
        resolve(e as T);
      },
      { once: true },
    );
  });
}

// ─── Stubs & cleanup ─────────────────────────────────────────────────────────

/**
 * Register a stub custom element (no-op if already defined).
 *
 * @example
 * mock('child-button', '<slot></slot>');
 */
export function mock(tagName: string, template = ''): void {
  if (!customElements.get(tagName)) {
    customElements.define(
      tagName,
      class extends HTMLElement {
        connectedCallback() {
          this.innerHTML = template;
        }
      },
    );
  }
}

/**
 * Remove all elements mounted via `mount()`.
 * Call in `afterEach` to keep tests isolated.
 *
 * @example
 * afterEach(() => cleanup());
 */
export function cleanup(): void {
  for (const el of _mountedElements) el.remove();
  _mountedElements.length = 0;
}
